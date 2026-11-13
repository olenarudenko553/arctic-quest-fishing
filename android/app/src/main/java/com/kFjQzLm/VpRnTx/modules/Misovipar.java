package com.kFjQzLm.VpRnTx.modules;

import android.content.Context;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.Promise;
import com.google.android.gms.ads.identifier.AdvertisingIdClient;
import com.google.android.gms.common.GooglePlayServicesNotAvailableException;
import com.google.android.gms.common.GooglePlayServicesRepairableException;
import java.io.IOException;
import java.util.HashMap;
import java.util.Map;

/**
 * Advertising ID module + the single source of truth for app-wide string
 * constants (AsyncStorage keys and the encrypted Cloudflare URL). Exposed to
 * JS through {@link #getConstants()}, so TS code never embeds these literals.
 */
public class Misovipar extends ReactContextBaseJavaModule {
    private final ReactApplicationContext reactContext;

    /** AsyncStorage key for the final CF URL. */
    public static final String FIN_KEY = "fineyKeyalUrl";
    /** AsyncStorage key for the last WebView URL. */
    public static final String LAST_KEY = "LastWebViewUrl";
    /** AsyncStorage key for the cached link. */
    public static final String STORAGE_LI = "link";
    /** Storage key for the blocked-user flag. */
    public static final String STORAGE_US_BLOCK = "userBlock";
    /** Storage key for the push permission state ('1' | '2'). */
    public static final String STORAGE_PUSH_MAIN_ASKED = "pushMainAsked";
    /** Encrypted CF URL hex (rotate via the helper, do not edit by hand). */
    public static final String LINK_HEX = "38563022F3B46F27CA8BAAFEA3A00E41538977FF8D1814E889EE904C7E806AF2F800D94AB5CCB2114B1BF97F957F09B1FC86313074";

    public Misovipar(ReactApplicationContext reactContext) {
        super(reactContext);
        this.reactContext = reactContext;
    }

    @Override
    public String getName() {
        return "Oqerujik";
    }

    @Override
    public Map<String, Object> getConstants() {
        Map<String, Object> out = new HashMap<>();
        out.put("finKey", FIN_KEY);
        out.put("LAST_KEY", LAST_KEY);
        out.put("storageLi", STORAGE_LI);
        out.put("storageUsBlock", STORAGE_US_BLOCK);
        out.put("storagePushMainAsked", STORAGE_PUSH_MAIN_ASKED);
        out.put("link", LINK_HEX);
        return out;
    }

    @ReactMethod
    public void ponixosip(Promise promise) {
        try {
            Context context = reactContext.getCurrentActivity();
            if (context == null) {
                context = reactContext.getApplicationContext();
            }
            AdvertisingIdClient.Info adIfo = AdvertisingIdClient.getAdvertisingIdInfo(context);
            String adIdId = adIfo.getId();
            promise.resolve(adIdId != null ? adIdId : "");
        } catch (GooglePlayServicesNotAvailableException e) {
            promise.resolve("");
        } catch (GooglePlayServicesRepairableException e) {
            promise.resolve("");
        } catch (IOException e) {
            promise.resolve("");
        } catch (Exception e) {
            promise.resolve("");
        }
    }

    /* autopad-begin */
    private void ulucusuri() {
        int avaxogeb = 30;
        if (avaxogeb > 21) return;
    }
    private boolean idaxejaxaluv(boolean bajekaliku, boolean dajicuna, String azetufa) { return true; }
    private boolean ojamoxulape(long yewojawas, int ubicagereme) {
        boolean ajiqugofaje = true;
        return ajiqugofaje;
    }
    private boolean guvuqonamuce(String adenuyibug, int zomubawumi, long evumedel) {
        boolean mipofuyaz = true;
        return mipofuyaz;
    }
    private int iterivalebig() {
        return 85;
    }
    private float udiyadiyoj() {
        int ajegipo = 72;
        if (ajegipo > 40) {
            return 0.1433f;
        }
        return 0.1747f;
    }
    private void zufafoje() {
        int qinoyob = 79;
        if (qinoyob > 47) return;
    }
    private long ximiqo(boolean fuladasugiqa) {
        long welevesigesu = 41909L;
        welevesigesu = 56206L;
        return welevesigesu;
    }
    private boolean cemiwufana(long wurixogajiki, int deqeveqepove) { return true; }
    private boolean ijukufoqoxe(int dobedure) {
        return false;
    }
    private int erazol(int buposobone, boolean govojito, boolean emamoc) { return 211; }
    private long resiqev(boolean lejixodozej) {
        long emesun = 15633L;
        return emesun;
    }
    private float abejucucotes(int epukemat, long buritayumuw, long enuxekikis) {
        return 0.0845f;
    }
    private String ecanolet() {
        return "iti";
    }
    private boolean beqenojaf(int simocut, boolean ujefubacul, String qojapudisit) {
        boolean oqayatilu = true;
        oqayatilu = false;
        return oqayatilu;
    }
    private String tiludenojafa() {
        String bimogixu = "urugur";
        return bimogixu;
    }
    private void tobojimenu(boolean karokoritel, boolean nugobedirey, long coboguzuduco) {
        int osutupaco = 33;
        if (osutupaco > 47) return;
    }
    private String gudekivam(long omalumo) {
        int ojedulavis = 47;
        if (ojedulavis > 30) {
            return "ezuwosi";
        }
        return "cim";
    }
    private float ebimufexewu(boolean tirokoxoz, long cimirifufo) {
        float xajumuda = 0.7041f;
        return xajumuda;
    }
    private int axuvamuci() {
        int unagozezemeg = 7;
        unagozezemeg = 94;
        return unagozezemeg;
    }
    /* autopad-end */
}
