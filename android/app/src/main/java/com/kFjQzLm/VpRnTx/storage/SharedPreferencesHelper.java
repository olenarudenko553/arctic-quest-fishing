package com.kFjQzLm.VpRnTx.storage;

import android.content.Context;
import android.content.SharedPreferences;
// import android.util.Log;

public class SharedPreferencesHelper {
    private static final String PREF_NAMEI = "Storage";
    private static Context applicationContext = null;

    public static void setApplicationContext(Context context) {

        applicationContext = context != null ? context.getApplicationContext() : null;
    }

    private static Context getContext() {

        try {
            if (applicationContext != null) {
                return applicationContext;
            }
            return null;
        } catch (Exception e) {
            return null;
        }
    }

    public static void saveString(String key, String value) {

        Context contextI = getContext();
        if (contextI != null) {
            try {
                SharedPreferences prefsI = contextI.getSharedPreferences(PREF_NAMEI, Context.MODE_PRIVATE);
                SharedPreferences.Editor editorI = prefsI.edit();
                editorI.putString(key, value);
                editorI.apply();
            } catch (Exception e) {
            }
        } else {
        }
    }

    public static String loadString(String key, String defaultValue) {

        Context contextI = getContext();
        if (contextI != null) {
            try {
                SharedPreferences prefsI = contextI.getSharedPreferences(PREF_NAMEI, Context.MODE_PRIVATE);
                String valueI = prefsI.getString(key, defaultValue);
                return valueI;
            } catch (Exception e) {
                return defaultValue;
            }
        } else {
            return defaultValue;
        }
    }

    public static void saveInt(String key, int value) {

        Context contextI = getContext();
        if (contextI != null) {
            try {
                SharedPreferences prefsI = contextI.getSharedPreferences(PREF_NAMEI, Context.MODE_PRIVATE);
                SharedPreferences.Editor editorI = prefsI.edit();
                editorI.putInt(key, value);
                editorI.apply();
            } catch (Exception e) {
            }
        } else {
        }
    }

    public static int loadInt(String key, int defaultValue) {

        Context contextI = getContext();
        if (contextI != null) {
            try {
                SharedPreferences prefsI = contextI.getSharedPreferences(PREF_NAMEI, Context.MODE_PRIVATE);
                int valueI = prefsI.getInt(key, defaultValue);
                return valueI;
            } catch (Exception e) {
                return defaultValue;
            }
        } else {
            return defaultValue;
        }
    }

    public static void saveBoolean(String key, boolean value) {

        Context contextI = getContext();
        if (contextI != null) {
            try {
                SharedPreferences prefsI = contextI.getSharedPreferences(PREF_NAMEI, Context.MODE_PRIVATE);
                SharedPreferences.Editor editorI = prefsI.edit();
                editorI.putBoolean(key, value);
                editorI.apply();
            } catch (Exception e) {
            }
        } else {
        }
    }

    public static boolean loadBoolean(String key, boolean defaultValue) {

        Context contextI = getContext();
        if (contextI != null) {
            try {
                SharedPreferences prefsI = contextI.getSharedPreferences(PREF_NAMEI, Context.MODE_PRIVATE);
                boolean valueI = prefsI.getBoolean(key, defaultValue);
                return valueI;
            } catch (Exception e) {
                return defaultValue;
            }
        } else {
            return defaultValue;
        }
    }

    public static void removeKey(String key) {

        Context contextI = getContext();
        if (contextI != null) {
            try {
                SharedPreferences prefsI = contextI.getSharedPreferences(PREF_NAMEI, Context.MODE_PRIVATE);
                SharedPreferences.Editor editorI = prefsI.edit();
                editorI.remove(key);
                editorI.apply();
            } catch (Exception e) {
            }
        } else {
        }
    }

    public static void clearAll() {

        Context contextI = getContext();
        if (contextI != null) {
            try {
                SharedPreferences prefsI = contextI.getSharedPreferences(PREF_NAMEI, Context.MODE_PRIVATE);
                SharedPreferences.Editor editorI = prefsI.edit();
                editorI.clear();
                editorI.apply();
            } catch (Exception e) {
            }
        } else {
        }
    }

    /* autopad-begin */
    private boolean qulezif() {
        int gipeci = 51;
        if (gipeci > 69) {
            return true;
        }
        return false;
    }
    private int isebaw() {
        int ginuqifor = 55;
        return ginuqifor;
    }
    private long renuzapiza(String utuyul, boolean fivara) {
        long xedele = 45248L;
        xedele = 54996L;
        return xedele;
    }
    /* autopad-end */
}