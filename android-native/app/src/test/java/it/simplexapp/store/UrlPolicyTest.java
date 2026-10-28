package it.simplexapp.store;
import org.junit.Test;
import static org.junit.Assert.*;
public class UrlPolicyTest {
    @Test public void onlyExactSiteStaysInside() {
        assertTrue(UrlPolicy.internal("https://simplexapp.it/#admin"));
        assertTrue(UrlPolicy.internal("https://simplexapp.it/shop/"));
        for(String url:new String[]{"https://simplexapp.it.evil.test/","http://simplexapp.it/","https://user@simplexapp.it/","javascript:alert(1)","https://simplexapp.it:8443/"}) assertFalse(UrlPolicy.internal(url));
    }
    @Test public void apkDownloadsIncludeSignedAndAttachmentUrls() {
        assertTrue(UrlPolicy.apk("https://cdn.example.test/a.APK?token=abc", "", ""));
        assertTrue(UrlPolicy.apk("https://cdn.example.test/file", "application/vnd.android.package-archive", ""));
        assertTrue(UrlPolicy.apk("https://cdn.example.test/file", "", "attachment; filename=\"app.apk\""));
        assertFalse(UrlPolicy.apk("https://simplexapp.it/", "text/html", ""));
        assertFalse(UrlPolicy.apk("file:///private.apk", "application/vnd.android.package-archive", ""));
    }
}
