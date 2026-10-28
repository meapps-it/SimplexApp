package it.simplexapp.store;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.app.AlertDialog;
import android.app.DownloadManager;
import android.content.ClipData;
import android.content.Intent;
import android.content.pm.PackageInfo;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.os.Environment;
import android.os.Message;
import android.provider.Settings;
import android.view.View;
import android.webkit.CookieManager;
import android.webkit.DownloadListener;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.ProgressBar;
import android.widget.TextView;
import android.widget.Toast;
import androidx.core.content.FileProvider;
import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.ArrayList;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicBoolean;

public class MainActivity extends Activity {
    private static final String HOME="https://simplexapp.it/";
    private static final int PICK_FILE=10, INSTALL_PERMISSION=20;
    private static final long MAX_APK=2L*1024*1024*1024;
    private WebView web;
    private ProgressBar loading;
    private TextView error;
    private ValueCallback<Uri[]> fileCallback;
    private final ExecutorService worker=Executors.newSingleThreadExecutor();
    private final AtomicBoolean cancelled=new AtomicBoolean();
    private volatile HttpURLConnection downloadConnection;
    private boolean downloading=false;
    private boolean waitingForPermission=false;

    @Override @SuppressLint("SetJavaScriptEnabled") public void onCreate(Bundle state) {
        super.onCreate(state);
        LinearLayout root=new LinearLayout(this);root.setOrientation(LinearLayout.VERTICAL);root.setBackgroundColor(Color.rgb(245,246,251));
        root.setOnApplyWindowInsetsListener((v,insets)->{v.setPadding(insets.getSystemWindowInsetLeft(),insets.getSystemWindowInsetTop(),insets.getSystemWindowInsetRight(),insets.getSystemWindowInsetBottom());return insets;});
        LinearLayout tools=new LinearLayout(this);tools.setPadding(dp(8),0,dp(8),0);
        Button home=new Button(this);home.setText("SimplexApp");home.setAllCaps(false);home.setOnClickListener(v->web.loadUrl(HOME));tools.addView(home,new LinearLayout.LayoutParams(0,dp(48),1));
        Button refresh=new Button(this);refresh.setText("Ricarica");refresh.setAllCaps(false);refresh.setOnClickListener(v->{error.setVisibility(View.GONE);web.reload();});tools.addView(refresh,new LinearLayout.LayoutParams(-2,dp(48)));root.addView(tools);
        loading=new ProgressBar(this,null,android.R.attr.progressBarStyleHorizontal);loading.setMax(100);root.addView(loading,new LinearLayout.LayoutParams(-1,dp(3)));
        error=new TextView(this);error.setText("Connessione non disponibile. Controlla Internet e premi Ricarica.");error.setPadding(dp(16),dp(12),dp(16),dp(12));error.setVisibility(View.GONE);root.addView(error);
        web=new WebView(this);root.addView(web,new LinearLayout.LayoutParams(-1,0,1));setContentView(root);
        WebSettings settings=web.getSettings();settings.setJavaScriptEnabled(true);settings.setDomStorageEnabled(true);settings.setAllowFileAccess(false);settings.setAllowContentAccess(true);settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);settings.setSupportMultipleWindows(true);settings.setJavaScriptCanOpenWindowsAutomatically(false);settings.setUserAgentString(settings.getUserAgentString()+" SimplexAppAndroid/1.0.0");
        CookieManager.getInstance().setAcceptCookie(true);
        web.setWebViewClient(new WebViewClient(){
            @Override public boolean shouldOverrideUrlLoading(WebView view,WebResourceRequest request){return route(request.getUrl().toString(),view);}
            @Override public void onPageFinished(WebView view,String url){loading.setVisibility(View.GONE);CookieManager.getInstance().flush();}
            @Override public void onReceivedError(WebView view,WebResourceRequest request,WebResourceError problem){if(request.isForMainFrame()){loading.setVisibility(View.GONE);error.setVisibility(View.VISIBLE);}}
        });
        web.setDownloadListener(downloadListener());
        web.setWebChromeClient(new WebChromeClient(){
            @Override public void onProgressChanged(WebView view,int progress){loading.setProgress(progress);loading.setVisibility(progress<100?View.VISIBLE:View.GONE);}
            @Override public boolean onShowFileChooser(WebView view,ValueCallback<Uri[]> callback,FileChooserParams params){
                if(fileCallback!=null)fileCallback.onReceiveValue(null);fileCallback=callback;
                Intent pick=new Intent(Intent.ACTION_OPEN_DOCUMENT);pick.addCategory(Intent.CATEGORY_OPENABLE);pick.setType("*/*");
                ArrayList<String> types=new ArrayList<>();
                for(String raw:params.getAcceptTypes())for(String type:raw.split(",")){type=type.trim();if(type.contains("/")&&!type.equals("*/*"))types.add(type);}
                if(!types.isEmpty())pick.putExtra(Intent.EXTRA_MIME_TYPES,types.toArray(new String[0]));
                pick.putExtra(Intent.EXTRA_ALLOW_MULTIPLE,params.getMode()==FileChooserParams.MODE_OPEN_MULTIPLE);
                try{startActivityForResult(pick,PICK_FILE);}catch(Exception e){fileCallback.onReceiveValue(null);fileCallback=null;message("Nessun gestore documenti disponibile.");}return true;
            }
            @Override public boolean onCreateWindow(WebView view,boolean dialog,boolean gesture,Message result){
                if(!gesture)return false;
                WebView popup=new WebView(MainActivity.this);
                popup.setWebViewClient(new WebViewClient(){@Override public boolean shouldOverrideUrlLoading(WebView v,WebResourceRequest r){String url=r.getUrl().toString();if(UrlPolicy.internal(url))web.loadUrl(url);else route(url,web);v.destroy();return true;}});
                popup.setDownloadListener((url,ua,cd,mime,size)->{downloadListener().onDownloadStart(url,ua,cd,mime,size);popup.destroy();});
                ((WebView.WebViewTransport)result.obj).setWebView(popup);result.sendToTarget();return true;
            }
        });
        if(state==null||web.restoreState(state)==null)web.loadUrl(HOME);
        if(pendingApk().isFile())new AlertDialog.Builder(this).setTitle("Download disponibile").setMessage("Vuoi riprendere l’installazione dell’APK già scaricato?").setPositiveButton("Installa",(d,w)->install()).setNegativeButton("Più tardi",null).show();
    }

    private int dp(int n){return Math.round(n*getResources().getDisplayMetrics().density);}
    private void message(String text){Toast.makeText(this,text,Toast.LENGTH_LONG).show();}
    private boolean route(String url,WebView source){
        if(UrlPolicy.apk(url,"","")){confirmDownload(url);return true;}
        if(UrlPolicy.internal(url))return false;
        Uri uri=Uri.parse(url);String scheme=uri.getScheme();
        // Google does not support authentication inside embedded WebViews.
        if(url.startsWith("https://qfjwtawsqfwmsmrrgqfi.supabase.co/auth/v1/authorize")||"accounts.google.com".equals(uri.getHost())){
            String current=source.getUrl();external(UrlPolicy.internal(current)?current:HOME);message("Per accedere con Google, continua nel browser e premi di nuovo Accedi con Google.");return true;
        }
        if("https".equals(scheme)||"http".equals(scheme)||"mailto".equals(scheme)||"tel".equals(scheme)||"whatsapp".equals(scheme))external(url);
        else message("Questo collegamento non è supportato.");
        return true;
    }
    private void external(String url){try{startActivity(new Intent(Intent.ACTION_VIEW,Uri.parse(url)).addCategory(Intent.CATEGORY_BROWSABLE));}catch(Exception e){message("Nessuna applicazione disponibile per aprire il collegamento.");}}
    private DownloadListener downloadListener(){return (url,ua,disposition,mime,size)->{
        if(UrlPolicy.apk(url,mime,disposition))confirmDownload(url);
        else if(UrlPolicy.https(url)){
            try{DownloadManager.Request request=new DownloadManager.Request(Uri.parse(url));request.setTitle("Download SimplexApp");request.setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED);request.setDestinationInExternalPublicDir(Environment.DIRECTORY_DOWNLOADS,android.webkit.URLUtil.guessFileName(url,disposition,mime));((DownloadManager)getSystemService(DOWNLOAD_SERVICE)).enqueue(request);message("Download avviato.");}catch(Exception e){message("Download non disponibile. Apri il sito nel browser.");}
        }else message("Questo file non può essere scaricato nell’app.");
    };}
    private void confirmDownload(String url){
        if(downloading){message("Un download è già in corso.");return;}
        if(!UrlPolicy.https(url)){message("È richiesto un collegamento HTTPS.");return;}
        new AlertDialog.Builder(this).setTitle("Scarica e installa").setMessage("Vuoi scaricare questa applicazione? Al termine Android ti chiederà di confermare l’installazione.").setPositiveButton("Scarica",(d,w)->download(url)).setNegativeButton("Annulla",null).show();
    }
    private File pendingApk(){return new File(getFilesDir(),"install/application.apk");}
    private void download(String url){
        if(downloading)return;downloading=true;cancelled.set(false);
        LinearLayout box=new LinearLayout(this);box.setOrientation(LinearLayout.VERTICAL);box.setPadding(dp(24),dp(8),dp(24),dp(8));
        TextView status=new TextView(this);status.setText("Download in corso…");ProgressBar progress=new ProgressBar(this,null,android.R.attr.progressBarStyleHorizontal);progress.setIndeterminate(true);box.addView(status);box.addView(progress);
        AlertDialog dialog=new AlertDialog.Builder(this).setTitle("Scaricamento APK").setView(box).setCancelable(false).setNegativeButton("Annulla",(d,w)->{cancelled.set(true);HttpURLConnection connection=downloadConnection;if(connection!=null)connection.disconnect();}).create();dialog.show();
        worker.execute(()->{
            File target=pendingApk(),part=new File(target.getParentFile(),"download.part");boolean success=false;String problem="Download non riuscito. Riprova.";
            try{
                if(!target.getParentFile().isDirectory()&&!target.getParentFile().mkdirs())throw new Exception("Spazio di download non disponibile.");
                String current=url;HttpURLConnection connection=null;
                for(int hop=0;hop<6;hop++){
                    if(cancelled.get())throw new Exception("Download annullato.");
                    if(!UrlPolicy.https(current))throw new Exception("Il server ha restituito un collegamento non sicuro.");
                    connection=(HttpURLConnection)new URL(current).openConnection();downloadConnection=connection;connection.setConnectTimeout(20000);connection.setReadTimeout(30000);connection.setInstanceFollowRedirects(false);
                    connection.setRequestProperty("User-Agent","SimplexAppAndroid/1.0.0");
                    // Never forward account cookies or authorization headers to download servers.
                    int code=connection.getResponseCode();
                    if(code>=300&&code<400){String location=connection.getHeaderField("Location");if(location==null)throw new Exception("Collegamento di download non valido.");current=new URL(new URL(current),location).toString();connection.disconnect();connection=null;continue;}
                    if(code!=200)throw new Exception("Download non disponibile ("+code+").");break;
                }
                if(connection==null)throw new Exception("Troppi reindirizzamenti durante il download.");
                long length=connection.getContentLengthLong();if(length>MAX_APK)throw new Exception("L’APK supera il limite di 2 GB.");
                if(length>0&&getFilesDir().getUsableSpace()<length+16*1024*1024)throw new Exception("Spazio insufficiente sul telefono.");
                long done=0,last=0;
                try(InputStream in=connection.getInputStream();FileOutputStream out=new FileOutputStream(part)){
                    byte[] buffer=new byte[65536];int n;
                    while((n=in.read(buffer))!=-1){
                        if(cancelled.get())throw new Exception("Download annullato.");done+=n;if(done>MAX_APK)throw new Exception("L’APK supera il limite di 2 GB.");out.write(buffer,0,n);
                        if(System.currentTimeMillis()-last>200){last=System.currentTimeMillis();long bytes=done;runOnUiThread(()->{progress.setIndeterminate(length<=0);if(length>0)progress.setProgress((int)Math.min(100,bytes*100/length));status.setText(String.format(java.util.Locale.ITALY,"Scaricati %.1f MB",bytes/1048576.0));});}
                    }
                    out.getFD().sync();
                }
                if(cancelled.get())throw new Exception("Download annullato.");
                if(length>=0&&done!=length)throw new Exception("Download incompleto. Riprova.");
                PackageInfo info=getPackageManager().getPackageArchiveInfo(part.getAbsolutePath(),0);
                if(info==null)throw new Exception("Il file scaricato non è un APK Android valido.");
                if(target.exists()&&!target.delete())throw new Exception("Impossibile sostituire il download precedente.");
                if(!part.renameTo(target))throw new Exception("Impossibile completare il download.");success=true;
            }catch(Exception e){if(e.getMessage()!=null)problem=e.getMessage();}
            finally{HttpURLConnection connection=downloadConnection;if(connection!=null)connection.disconnect();downloadConnection=null;if(part.exists())part.delete();}
            final boolean ready=success;final String detail=problem;
            runOnUiThread(()->{downloading=false;if(isFinishing()||isDestroyed())return;dialog.dismiss();if(ready)install();else if(!cancelled.get())new AlertDialog.Builder(this).setTitle("Download non completato").setMessage(detail).setPositiveButton("Riprova",(d,w)->download(url)).setNegativeButton("Chiudi",null).show();});
        });
    }
    private void install(){
        if(!pendingApk().isFile()){message("Nessun APK disponibile.");return;}
        if(!getPackageManager().canRequestPackageInstalls()){
            new AlertDialog.Builder(this).setTitle("Consenti l’installazione").setMessage("Per installare gli APK scaricati, Android richiede di autorizzare SimplexApp come fonte. Attiva l’opzione e torna qui: il download è già pronto.").setPositiveButton("Apri impostazioni",(d,w)->{waitingForPermission=true;try{startActivityForResult(new Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES,Uri.parse("package:"+getPackageName())),INSTALL_PERMISSION);}catch(Exception e){waitingForPermission=false;message("Apri Impostazioni Android e autorizza SimplexApp a installare app.");}}).setNegativeButton("Più tardi",null).show();return;
        }
        try{Uri uri=FileProvider.getUriForFile(this,getPackageName()+".files",pendingApk());Intent intent=new Intent(Intent.ACTION_VIEW).setDataAndType(uri,"application/vnd.android.package-archive").addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);intent.setClipData(ClipData.newRawUri("APK",uri));startActivity(intent);}catch(Exception e){message("Android non ha aperto l’installazione. Riapri SimplexApp per riprovare.");}
    }
    @Override protected void onActivityResult(int request,int result,Intent data){super.onActivityResult(request,result,data);
        if(request==INSTALL_PERMISSION){waitingForPermission=false;if(getPackageManager().canRequestPackageInstalls())install();else message("Download conservato. L’autorizzazione è necessaria per installare.");}
        if(request==PICK_FILE&&fileCallback!=null){
            ArrayList<Uri> accepted=new ArrayList<>();
            if(result==RESULT_OK&&data!=null){ClipData clip=data.getClipData();if(clip!=null){for(int i=0;i<Math.min(clip.getItemCount(),100);i++)addUpload(accepted,clip.getItemAt(i).getUri());}else addUpload(accepted,data.getData());}
            fileCallback.onReceiveValue(accepted.isEmpty()?null:accepted.toArray(new Uri[0]));fileCallback=null;
        }
    }
    private void addUpload(ArrayList<Uri> out,Uri uri){if(uri==null||!"content".equals(uri.getScheme())||(getPackageName()+".files").equals(uri.getAuthority()))return;try{getContentResolver().openAssetFileDescriptor(uri,"r").close();out.add(uri);}catch(Exception ignored){}}
    @Override protected void onSaveInstanceState(Bundle out){super.onSaveInstanceState(out);web.saveState(out);}
    @Override public void onBackPressed(){if(web.canGoBack())web.goBack();else super.onBackPressed();}
    @Override protected void onDestroy(){cancelled.set(true);HttpURLConnection connection=downloadConnection;if(connection!=null)connection.disconnect();worker.shutdownNow();if(fileCallback!=null)fileCallback.onReceiveValue(null);web.destroy();super.onDestroy();}
}
