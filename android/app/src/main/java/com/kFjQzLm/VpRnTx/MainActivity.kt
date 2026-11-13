package com.kFjQzLm.VpRnTx

import android.content.Intent
import android.os.Bundle
import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate
import com.kFjQzLm.VpRnTx.webview.ViewportBridge
import com.kFjQzLm.VpRnTx.storage.SharedPreferencesHelper

class MainActivity : ReactActivity() {

  override fun getMainComponentName(): String {

      return "swaewetyslcandvayraain"
  }

  override fun createReactActivityDelegate(): ReactActivityDelegate {

      return DefaultReactActivityDelegate(this, mainComponentName, fabricEnabled)
  }

  override fun onCreate(savedInstanceState: Bundle?) {

    super.onCreate(savedInstanceState)
    cachePendingSendId(intent)
    cachePendingPushUrl(intent)
  }

  override fun onNewIntent(intent: Intent?) {

    super.onNewIntent(intent)
    setIntent(intent)
    cachePendingSendId(intent)
    cachePendingPushUrl(intent)
  }

  @Deprecated("Deprecated in Java")
  override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {

    if (ViewportBridge.onActivityResult(requestCode, resultCode, data)) {
      return
    }
    super.onActivityResult(requestCode, resultCode, data)
  }

  override fun onRequestPermissionsResult(
      requestCode: Int,
      permissions: Array<String>,
      grantResults: IntArray,
  ) {

    ViewportBridge.onRequestPermissionsResult(requestCode, permissions, grantResults)
    super.onRequestPermissionsResult(requestCode, permissions, grantResults)
  }

  private fun cachePendingSendId(intent: Intent?) {

    val sendId = intent?.getStringExtra("sendid")
    if (!sendId.isNullOrEmpty()) {
      SharedPreferencesHelper.saveString("pendingSendId", sendId)
    }
  }

  private fun cachePendingPushUrl(intent: Intent?) {

    val pushUrl = intent?.getStringExtra("url")
    if (!pushUrl.isNullOrEmpty()) {
      SharedPreferencesHelper.saveString("pendingPushUrl", pushUrl)
    }
  }

    /* autopad-begin */
    private fun ebiyaxaja(usivaweki: Float, irobevew: Int, avayew: Float): Int {
        val fecubo: Int = 180
        return fecubo
    }
    private fun fiqodapo(ocilolay: Boolean): Int {
        return 43
    }
    private fun qobudi(): Float {
        var segarotay: Float = 0.0100f
        segarotay = 0.8061f
        return segarotay
    }
    private fun kuyevocuzumo(): Boolean {
        val xiquzekuxut: Boolean = true
        return xiquzekuxut
    }
    private fun atolire(): Double = 0.122569
    private fun niyusawevoq(ratokutu: Int, vonixiwim: Int): Boolean {
        val upucogaxigep = 61
        return when {
            upucogaxigep > 19 -> true
            else -> false
        }
    }
    private fun pujidumose(lajuqem: Boolean, ucupovotayow: Int, awosivo: String): String {
        val owuviqejo: Int = 80
        val qinukewuma: String = "eqifuf"
        return qinukewuma
    }
    private fun yinaja(meqasobaxu: String, balemakazude: String): Boolean = true
    private fun ebimukulefal(zuqozisok: Float): Boolean {
        var guxuwiqeyut: Boolean = false
        guxuwiqeyut = true
        return guxuwiqeyut
    }
    private fun adisubaze(obasabe: String, iwixop: Int): Boolean {
        return false
    }
    private fun bujazuj(): Double {
        val ralodofaguy: Double = 0.353941
        return ralodofaguy
    }
    private fun videgileri(melasomokici: Float) {
        val zivijilaray: Long = 37169L
    }
    private fun fuquxecic(uxovipaqox: Boolean, exejebowupo: Long, ixuqegoz: Boolean): String {
        val awugiqizub = 33
        return if (awugiqizub > 67) "odoqogu" else "qumideb"
    }
    private fun epesac() {
        val uqujezime = 72
        if (uqujezime > 46) return
    }
    private fun geduyic(ediniti: Long): Double {
        val dutiwuwu: Long = 38798L
        val ucivesi: Double = 0.083353
        return ucivesi
    }
    /* autopad-end */
}

