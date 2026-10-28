package it.simplexapp.store;

import java.net.URI;
import java.util.Locale;

final class UrlPolicy {
    static boolean https(String value) {
        try { URI u = URI.create(value); return "https".equalsIgnoreCase(u.getScheme()) && u.getHost()!=null && u.getUserInfo()==null; }
        catch (Exception ignored) { return false; }
    }
    static boolean internal(String value) {
        if (!https(value)) return false;
        URI u=URI.create(value);
        return "simplexapp.it".equalsIgnoreCase(u.getHost()) && (u.getPort()==-1 || u.getPort()==443);
    }
    static boolean apk(String value, String mime, String disposition) {
        if (!https(value)) return false;
        return URI.create(value).getPath().toLowerCase(Locale.ROOT).endsWith(".apk")
            || "application/vnd.android.package-archive".equalsIgnoreCase(mime)
            || (disposition!=null && disposition.toLowerCase(Locale.ROOT).matches(".*\\.apk(?:[\"';\\s].*)?$"));
    }
}
