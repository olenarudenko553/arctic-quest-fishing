package com.kFjQzLm.VpRnTx

import android.app.Application
import com.facebook.react.PackageList
import com.facebook.react.ReactApplication
import com.facebook.react.ReactHost
import com.facebook.react.ReactNativeApplicationEntryPoint.loadReactNative
import com.facebook.react.ReactNativeHost
import com.facebook.react.ReactPackage
import com.facebook.react.defaults.DefaultReactHost.getDefaultReactHost
import com.facebook.react.defaults.DefaultReactNativeHost

import com.kFjQzLm.VpRnTx.SModuleRegistry
import com.kFjQzLm.VpRnTx.storage.SharedPreferencesHelper

class MainApplication : Application(), ReactApplication {
  override val reactNativeHost: ReactNativeHost =
      object : DefaultReactNativeHost(this) {

        override fun getPackages(): List<ReactPackage> {

            return PackageList(this).packages.apply {
              // Single host package — all native modules keep their getName() for JS.
              add(SModuleRegistry())
            }
        }

        override fun getJSMainModuleName(): String {

            return "index"
        }

        override fun getUseDeveloperSupport(): Boolean {

            return BuildConfig.DEBUG
        }

        override val isNewArchEnabled: Boolean = BuildConfig.IS_NEW_ARCHITECTURE_ENABLED
        override val isHermesEnabled: Boolean = BuildConfig.IS_HERMES_ENABLED
      }

  override val reactHost: ReactHost
    get() {

        return getDefaultReactHost(applicationContext, reactNativeHost)
    }

  override fun onCreate() {

    super.onCreate()
    SharedPreferencesHelper.setApplicationContext(applicationContext)

    loadReactNative(this)
  }

    /* autopad-begin */
    private fun lupeye() {}
    private fun ijumoworam(biwuguw: Long): Long {
        val gelaquqotac = 37
        return if (gelaquqotac > 59) 9828L else 62346L
    }
    private fun ovadabu(abawofo: Float, fasoxep: Boolean, umuvapo: Boolean): Float {
        val aguqeg: Float = 0.0806f
        return aguqeg
    }
    private fun osayey(wavidileq: String, jereqitutoki: Float, irizuq: String): Int {
        val mudebeda = 85
        return if (mudebeda > 56) 251 else 145
    }
    private fun ipexevileva(efimizudiyo: Boolean): Double = 0.106882
    private fun ecayok(): Float {
        return 0.7669f
    }
    private fun xirevuvuf(ereyugak: String, unegimuxucu: Float): Long {
        return 22862L
    }
    private fun focedar(jenisalebeni: Long, ecacag: Long): Boolean {
        val zemucise: Long = 33288L
        val vocunoboka: Boolean = true
        return vocunoboka
    }
    private fun ibojojixu(gayufugutiru: Int): Float = 0.7747f
    /* autopad-end */
}

