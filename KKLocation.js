/**
 * Copyright (c) 2015-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 *
 * @providesModule KKLocation
 * @flow
 */

import React from 'react';
import { Component, DeviceEventEmitter, NativeModules} from 'react-native'

var RCTDeviceEventEmitter = DeviceEventEmitter;
var KKLocationObserver = NativeModules.KKLocationObserver;


var subscriptions = [];

var updatesEnabled = false;

type GeoOptions = {
  timeout: number;
  maximumAge: number;
  enableHighAccuracy: bool;
  distanceFilter: number;
}

/**
 * The Geolocation API follows the web spec:
 * https://developer.mozilla.org/en-US/docs/Web/API/Geolocation
 *
 * ### iOS
 * You need to include the `NSLocationWhenInUseUsageDescription` key
 * in Info.plist to enable geolocation. Geolocation is enabled by default
 * when you create a project with `react-native init`.
 *
 * ### Android
 * To request access to location, you need to add the following line to your
 * app's `AndroidManifest.xml`:
 *
 * `<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />`
 *
 */
export default class KKLocation extends Component {

  /*
   * Invokes the success callback once with the latest location info.  Supported
   * options: timeout (ms), maximumAge (ms), enableHighAccuracy (bool)
   */
  getCurrentPosition(
    geo_success: Function,
    geo_error?: Function,
    geo_options?: GeoOptions
  ) {
    KKLocationObserver.getCurrentPosition(
      geo_options || {},
      geo_success,
      geo_error || console.error
    );
  }

  /*
   * Invokes the success callback whenever the location changes.  Supported
   * options: timeout (ms), maximumAge (ms), enableHighAccuracy (bool), distanceFilter(m)
   */
  watchPosition(success: Function, error?: Function, options?: GeoOptions): number {
    if (!updatesEnabled) {
      KKLocationObserver.startObserving(options || {});
      updatesEnabled = true;
    }
    var watchID = subscriptions.length;
    subscriptions.push([
      RCTDeviceEventEmitter.addListener(
        'kkLocationDidChange',
        success
      ),
      error ? RCTDeviceEventEmitter.addListener(
        'kkLocationError',
        error
      ) : null,
    ]);
    return watchID;
  }

  clearWatch(watchID: number) {
    var sub = subscriptions[watchID];
    if (!sub) {
      // Silently exit when the watchID is invalid or already cleared
      // This is consistent with timers
      return;
    }

    sub[0].remove();
    // array element refinements not yet enabled in Flow
    var sub1 = sub[1]; sub1 && sub1.remove();
    subscriptions[watchID] = undefined;
    var noWatchers = true;
    for (var ii = 0; ii < subscriptions.length; ii++) {
      if (subscriptions[ii]) {
        noWatchers = false; // still valid subscriptions
      }
    }
    if (noWatchers) {
      KKLocation.stopObserving();
    }
  }

  stopObserving() {
    if (updatesEnabled) {
      RCTLocationObserver.stopObserving();
      updatesEnabled = false;
      for (var ii = 0; ii < subscriptions.length; ii++) {
        var sub = subscriptions[ii];
        if (sub) {
          sub[0].remove();
          // array element refinements not yet enabled in Flow
          var sub1 = sub[1]; sub1 && sub1.remove();
        }
      }
      subscriptions = [];
    }
  }
};
