package com.kFjQzLm.VpRnTx.linkkit;

import android.net.Uri;

import bolts.Task;

public interface AppLinkResolver {
  Task<AppLink> getAppLinkFromUrlInBackground(Uri url);
}