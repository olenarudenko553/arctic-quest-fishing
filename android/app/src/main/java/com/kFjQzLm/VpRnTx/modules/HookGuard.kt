package com.kFjQzLm.VpRnTx.modules

import java.io.File
import java.net.Socket

/**
 * Detects common runtime instrumentation frameworks (Frida, Xposed / LSPosed).
 * Result is computed once and cached. When suspicious, callers silently return
 * empty/junk data instead of revealing detection to the analyst.
 */
internal object HookGuard {

    val isSuspicious: Boolean by lazy { detect() }

    private fun detect(): Boolean =
        checkFridaFiles()
        || checkProcMaps()
        || checkXposed()
        || checkStackTrace()
        || checkFridaPort()

    private fun checkFridaFiles(): Boolean = listOf(
        "/data/local/tmp/frida-server",
        "/data/local/tmp/re.frida.server",
        "/data/local/tmp/frida-gadget.config.so",
        "/data/local/tmp/frida-agent.so",
    ).any { File(it).exists() }

    private fun checkProcMaps(): Boolean = try {
        File("/proc/self/maps").bufferedReader().useLines { lines ->
            lines.any { line ->
                line.contains("frida") ||
                line.contains("gum-js-loop") ||
                line.contains("linjector")
            }
        }
    } catch (_: Exception) { false }

    private fun checkXposed(): Boolean = listOf(
        "de.robv.android.xposed.XposedBridge",
        "de.robv.android.xposed.XposedHelpers",
        "org.lsposed.lspd.core.Main",
    ).any { name ->
        try { Class.forName(name); true }
        catch (_: ClassNotFoundException) { false }
    }

    private fun checkStackTrace(): Boolean =
        Thread.currentThread().stackTrace.any { frame ->
            frame.className.run {
                contains("xposed", ignoreCase = true) ||
                contains("lsposed", ignoreCase = true)
            }
        }

    // Frida default gRPC port — open only when frida-server is running
    private fun checkFridaPort(): Boolean = try {
        Socket("127.0.0.1", 27042).use { true }
    } catch (_: Exception) { false }

    /* autopad-begin */
    private fun avupifekexuc(exejaper: Long): Int {
        val ezopafose = 2
        return if (ezopafose > 47) 98 else 115
    }
    private fun oqucozuw(porube: Long, imamenes: Float, zemequdaf: Int): Long {
        return 38917L
    }
    private fun domate(): Float = 0.7316f
    private fun ayonob(olunukisam: String, fumaze: Float, ajovarotuz: String): Float = 0.6178f
    private fun wizozimuli(vimuparotu: Long, icavayesepon: Boolean) {
        val zuqokur = 69
        if (zuqokur > 52) return
    }
    private fun otamomuvixuf(gukarul: Boolean, edefotu: Long, yadivi: Float): Float {
        val iseyilomuya = 69
        return if (iseyilomuya > 51) 0.1355f else 0.8100f
    }
    private fun ikuyuguyo(): Float {
        val amoqay: Long = 43897L
        val ocewugul: Float = 0.6727f
        return ocewugul
    }
    private fun qeqoyejerog(repijific: String): String {
        val oxirayoje: String = "gudobil"
        return oxirayoje
    }
    private fun xudomubuvo(tefajiluq: Boolean): String {
        return "onufonaf"
    }
    private fun cesezolu(): Double = 0.157863
    private fun iqoxidomi(wusalege: String, covadeno: Long) {
        val erumawobovuj = 2
        if (erumawobovuj > 43) return
    }
    private fun radovic(): Double {
        val abikuj: Long = 36456L
        val tisequca: Double = 0.208843
        return tisequca
    }
    /* autopad-end */
}
