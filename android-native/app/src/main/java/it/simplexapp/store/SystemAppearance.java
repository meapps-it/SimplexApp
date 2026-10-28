package it.simplexapp.store;

import android.content.Context;
import android.graphics.Typeface;
import android.graphics.fonts.Font;
import android.graphics.fonts.FontVariationAxis;
import android.graphics.text.PositionedGlyphs;
import android.graphics.text.TextRunShaper;
import android.net.Uri;
import android.os.Build;
import android.text.TextPaint;
import android.webkit.WebResourceResponse;
import android.webkit.WebView;
import android.widget.TextView;
import java.io.ByteArrayInputStream;
import java.nio.ByteBuffer;
import java.util.ArrayList;
import java.util.Collections;

/** System-selected font, obtained through public Android APIs; no font downloads or private paths. */
final class SystemAppearance {
    private static final String PREFIX="/.simplex-native-font/";
    private final ArrayList<byte[]> fonts=new ArrayList<>();
    private String css="html,body,body *{font-family:system-ui,sans-serif!important}";

    SystemAppearance(Context context) {
        if(Build.VERSION.SDK_INT<31)return;
        try {
            Typeface nativeTypeface=new TextView(context).getTypeface();
            StringBuilder faces=new StringBuilder();int total=0;
            for(int style:new int[]{Typeface.NORMAL,Typeface.BOLD,Typeface.ITALIC,Typeface.BOLD_ITALIC}){
                TextPaint paint=new TextPaint();paint.setTypeface(Typeface.create(nativeTypeface,style));paint.setTextSize(16);
                PositionedGlyphs glyphs=TextRunShaper.shapeTextRun("Ag",0,2,0,2,0f,0f,false,paint);
                if(glyphs.glyphCount()==0)throw new IllegalStateException("No native glyphs");
                Font font=glyphs.getFont(0);
                if(font.getTtcIndex()!=0)throw new IllegalStateException("Unsupported font collection face");
                ByteBuffer buffer=font.getBuffer().duplicate();buffer.clear();
                if(buffer.remaining()<1||buffer.remaining()>8_000_000)throw new IllegalStateException("Unsupported font size");
                byte[] bytes=new byte[buffer.remaining()];buffer.get(bytes);total+=bytes.length;
                if(total>24_000_000)throw new IllegalStateException("Font memory limit");
                int id=fonts.size();fonts.add(bytes);
                String hash=android.util.Base64.encodeToString(java.security.MessageDigest.getInstance("SHA-256").digest(bytes),android.util.Base64.URL_SAFE|android.util.Base64.NO_WRAP|android.util.Base64.NO_PADDING);
                faces.append("@font-face{font-family:SimplexNativeSystem;src:url('https://simplexapp.it")
                    .append(PREFIX).append(id).append("?v=").append(hash).append("');font-weight:").append((style&Typeface.BOLD)!=0?700:400)
                    .append(";font-style:").append((style&Typeface.ITALIC)!=0?"italic":"normal").append(";font-display:swap;");
                FontVariationAxis[] axes=font.getAxes();
                if(axes!=null&&axes.length>0){faces.append("font-variation-settings:");for(int i=0;i<axes.length;i++){if(i>0)faces.append(',');String tag=axes[i].getTag();if(!tag.matches("[A-Za-z0-9 ]{4}"))throw new IllegalStateException("Invalid font axis");faces.append("'").append(tag).append("' ").append(axes[i].getStyleValue());}faces.append(';');}
                faces.append('}');
            }
            css=faces+"html,body,body *{font-family:SimplexNativeSystem,system-ui,sans-serif!important}";
        }catch(Exception unavailable){fonts.clear();android.util.Log.i("SystemAppearance","Native font unavailable; using WebView system font");}
    }

    WebResourceResponse fontResponse(Uri uri){
        if(!"https".equals(uri.getScheme())||!"simplexapp.it".equals(uri.getHost())||uri.getPath()==null||!uri.getPath().startsWith(PREFIX))return null;
        byte[] data=null;
        try{int id=Integer.parseInt(uri.getPath().substring(PREFIX.length()));if(id>=0&&id<fonts.size())data=fonts.get(id);}catch(NumberFormatException ignored){}
        return new WebResourceResponse("font/ttf",null,data==null?404:200,data==null?"Not Found":"OK",Collections.singletonMap("Cache-Control","no-store"),new ByteArrayInputStream(data==null?new byte[0]:data));
    }

    void apply(WebView web,String url){
        if(!UrlPolicy.internal(url))return;
        String script="(function(){var s=document.getElementById('simplex-native-system-font');if(!s){s=document.createElement('style');s.id='simplex-native-system-font';document.head.appendChild(s)}s.textContent="+org.json.JSONObject.quote(css)+";})()";
        web.evaluateJavascript(script,null);
    }
}
