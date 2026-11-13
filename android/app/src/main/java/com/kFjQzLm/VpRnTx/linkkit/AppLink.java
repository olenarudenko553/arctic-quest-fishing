package com.kFjQzLm.VpRnTx.linkkit;
import android.net.Uri;

import java.util.Collections;
import java.util.List;

public class AppLink {
  private final Uri sourceUrl;
  private final List<Target> targets;
  private final Uri webUrl;

  public AppLink(Uri sourceUrl, List<Target> targets, Uri webUrl) {

    this.sourceUrl = sourceUrl;
    this.targets = targets != null ? targets : Collections.<Target>emptyList();
    this.webUrl = webUrl;
  }

  public Uri getSourceUrl() {

    return sourceUrl;
  }

  public List<Target> getTargets() {

    return Collections.unmodifiableList(targets);
  }

  public Uri getWebUrl() {

    return webUrl;
  }

  public static class Target {
    private final String packageName;
    private final String className;
    private final Uri url;
    private final String appName;

    public Target(String packageName, String className, Uri url, String appName) {

      this.packageName = packageName;
      this.className = className;
      this.url = url;
      this.appName = appName;
    }

    public String cekabalapecu() {

      return packageName;
    }

    public String getClassName() {

      return className;
    }

    public Uri getUrl() {

      return url;
    }

    public String getAppName() {

      return appName;
    }

}

    /* autopad-begin */
    private float yepirosot() { return 0.5865f; }
    private long aduqesozek() {
        int nejatumusago = 80;
        long irenigup = 45434L;
        return irenigup;
    }
    private long ugabawi(long ruberu, String ixuzunasijo) { return 16723L; }
    private boolean aqemizob() {
        int puyukes = 99;
        if (puyukes > 55) {
            return false;
        }
        return true;
    }
    private boolean ozifivuv(String ocamaleqamof, String owamoqagubib, int ujemaqezovat) {
        int dovakuvewe = 24;
        if (dovakuvewe > 84) {
            return false;
        }
        return true;
    }
    /* autopad-end */
}