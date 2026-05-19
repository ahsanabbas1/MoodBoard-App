import { forwardRef, useImperativeHandle, useRef } from 'react';
import { StyleSheet, Linking, Platform } from 'react-native';
import { WebView } from 'react-native-webview';

export interface LeafletMarker {
  id: string;
  latitude: number;
  longitude: number;
  emoji: string;
  name: string;
  subtitle?: string;
}

export interface LeafletMapRef {
  flyTo: (lat: number, lng: number, zoom?: number) => void;
}

interface Props {
  markers: LeafletMarker[];
  userCoords?: { latitude: number; longitude: number } | null;
  onMarkerPress?: (id: string) => void;
  style?: any;
}

// ─── Leaflet CSS (inlined — no CDN dependency for styles) ─────────────────────
// This is the complete Leaflet 1.9.4 stylesheet. Inlining it means tiles always
// render correctly even if the CDN is slow or unreachable.
const LEAFLET_CSS = `
.leaflet-pane,.leaflet-tile,.leaflet-marker-icon,.leaflet-marker-shadow,.leaflet-tile-container,.leaflet-pane>svg,.leaflet-pane>canvas,.leaflet-zoom-box,.leaflet-image-layer,.leaflet-layer{position:absolute;left:0;top:0}
.leaflet-container{overflow:hidden}
.leaflet-tile,.leaflet-marker-icon,.leaflet-marker-shadow{-webkit-user-select:none;-moz-user-select:none;user-select:none;-webkit-user-drag:none}
.leaflet-tile::selection,.leaflet-tile::-moz-selection{background:transparent}
.leaflet-image-layer,.leaflet-layer{position:absolute}
.leaflet-container.leaflet-touch-zoom{touch-action:pan-x pan-y}
.leaflet-container.leaflet-touch-drag{touch-action:none;touch-action:pinch-zoom}
.leaflet-container.leaflet-touch-drag.leaflet-touch-zoom{touch-action:none}
.leaflet-container{-webkit-tap-highlight-color:transparent}
.leaflet-container a{-webkit-tap-highlight-color:rgba(51,181,229,.4)}
.leaflet-tile{filter:inherit;visibility:hidden}
.leaflet-tile-loaded{visibility:inherit}
.leaflet-zoom-box{width:0;height:0;box-sizing:border-box;z-index:800}
.leaflet-overlay-pane svg{-moz-user-select:none}
.leaflet-pane{z-index:400}
.leaflet-tile-pane{z-index:200}
.leaflet-overlay-pane{z-index:400}
.leaflet-shadow-pane{z-index:500}
.leaflet-marker-pane{z-index:600}
.leaflet-tooltip-pane{z-index:650}
.leaflet-popup-pane{z-index:700}
.leaflet-map-pane canvas{z-index:1}
.leaflet-map-pane svg{z-index:2}
.leaflet-control{position:relative;z-index:800;pointer-events:auto}
.leaflet-top,.leaflet-bottom{position:absolute;z-index:1000;pointer-events:none}
.leaflet-top{top:0}.leaflet-right{right:0}.leaflet-bottom{bottom:0}.leaflet-left{left:0}
.leaflet-control{float:left;clear:both}
.leaflet-right .leaflet-control{float:right}
.leaflet-top .leaflet-control{margin-top:10px}
.leaflet-bottom .leaflet-control{margin-bottom:10px}
.leaflet-left .leaflet-control{margin-left:10px}
.leaflet-right .leaflet-control{margin-right:10px}
.leaflet-fade-anim .leaflet-popup{opacity:0;transition:opacity .2s linear}
.leaflet-fade-anim .leaflet-map-pane .leaflet-popup{opacity:1}
.leaflet-zoom-animated{transform-origin:0 0}
.leaflet-zoom-anim .leaflet-zoom-animated{transition:transform .25s cubic-bezier(0,0,.25,1)}
.leaflet-zoom-anim .leaflet-tile,.leaflet-pan-anim .leaflet-tile{transition:none}
.leaflet-zoom-anim .leaflet-zoom-animated{will-change:transform}
.leaflet-interactive{cursor:pointer}
.leaflet-grab{cursor:grab}
.leaflet-crosshair,.leaflet-crosshair .leaflet-interactive{cursor:crosshair}
.leaflet-popup-pane,.leaflet-control{cursor:auto}
.leaflet-dragging .leaflet-grab,.leaflet-dragging .leaflet-grab .leaflet-interactive,.leaflet-dragging .leaflet-marker-draggable{cursor:grabbing}
.leaflet-marker-icon,.leaflet-marker-shadow,.leaflet-image-layer,.leaflet-pane>svg path,.leaflet-tile-container{pointer-events:none}
.leaflet-marker-icon.leaflet-interactive,.leaflet-image-layer.leaflet-interactive,.leaflet-pane>svg path.leaflet-interactive,svg.leaflet-image-layer.leaflet-interactive path{pointer-events:auto}
.leaflet-container{background:#ddd;outline-offset:1px}
.leaflet-zoom-box{border:2px dotted #38f;background:rgba(255,255,255,.5)}
.leaflet-container{font-family:Helvetica Neue,Arial,Helvetica,sans-serif;font-size:12px;line-height:1.5}
.leaflet-bar{box-shadow:0 1px 5px rgba(0,0,0,.65);border-radius:4px}
.leaflet-bar a,.leaflet-bar a:hover,.leaflet-bar a:focus{background-color:#fff;border-bottom:1px solid #ccc;width:26px;height:26px;line-height:26px;display:block;text-align:center;text-decoration:none;color:#000}
.leaflet-bar a:hover,.leaflet-bar a:focus{background-color:#f4f4f4}
.leaflet-bar a:first-child{border-top-left-radius:4px;border-top-right-radius:4px}
.leaflet-bar a:last-child{border-bottom-left-radius:4px;border-bottom-right-radius:4px;border-bottom:none}
.leaflet-bar a.leaflet-disabled{cursor:default;background-color:#f4f4f4;color:#bbb}
.leaflet-touch .leaflet-bar a{width:30px;height:30px;line-height:30px}
.leaflet-control-zoom-in,.leaflet-control-zoom-out{font:bold 18px 'Lucida Console',Monaco,monospace;text-indent:1px}
.leaflet-touch .leaflet-control-zoom-in{font-size:22px}
.leaflet-touch .leaflet-control-zoom-out{font-size:20px}
.leaflet-control-layers{box-shadow:0 1px 5px rgba(0,0,0,.4);background:#fff;border-radius:5px}
.leaflet-container .leaflet-control-attribution{background:rgba(255,255,255,.8);margin:0}
.leaflet-control-attribution,.leaflet-control-scale-line{padding:0 5px;color:#333;line-height:1.4}
.leaflet-popup{position:absolute;text-align:center;margin-bottom:20px}
.leaflet-popup-content-wrapper,.leaflet-popup-tip{background:#fff;color:#333;box-shadow:0 3px 14px rgba(0,0,0,.4)}
.leaflet-popup-content-wrapper{padding:1px;text-align:left;border-radius:12px}
.leaflet-popup-tip-container{width:40px;height:20px;position:relative;margin:0 auto;overflow:hidden;pointer-events:none}
.leaflet-popup-tip{width:17px;height:17px;padding:1px;margin:-10px auto 0;pointer-events:auto;transform:rotate(45deg)}
.leaflet-popup-content-wrapper a{color:#0078a8}
.leaflet-popup-content{margin:13px 24px 13px 20px;line-height:1.3;font-size:13px;min-height:1px}
.leaflet-popup-content p{margin:1.3em 0}
.leaflet-popup-close-button{position:absolute;top:0;right:0;border:none;text-align:center;width:24px;height:24px;font:16px/24px Tahoma,Verdana,sans-serif;color:#757575;text-decoration:none;background:transparent}
.leaflet-popup-close-button:hover,.leaflet-popup-close-button:focus{color:#585858}
.leaflet-div-icon{background:#fff;border:1px solid #666}
.leaflet-tooltip{position:absolute;padding:6px;background-color:#fff;border:1px solid #fff;border-radius:3px;color:#222;white-space:nowrap;user-select:none;pointer-events:none;box-shadow:0 1px 3px rgba(0,0,0,.4)}
.leaflet-control-attribution{display:none}
`;

// ─── HTML page builder ─────────────────────────────────────────────────────────

function buildHtml(
  markers: LeafletMarker[],
  userCoords: { latitude: number; longitude: number } | null | undefined,
): string {
  const center = userCoords ?? markers[0] ?? { latitude: 20, longitude: 0 };
  const zoom   = markers.length === 0 ? 2 : markers.length === 1 ? 13 : 5;

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0,maximum-scale=1.0,user-scalable=no"/>
  <style>
    /* Reset */
    *{margin:0;padding:0;box-sizing:border-box}
    html,body{width:100%;height:100%;background:#eaeaea}

    /* Map fills the entire WebView */
    #map{
      position:absolute;
      top:0;left:0;right:0;bottom:0;
      width:100%;height:100%;
    }

    /* Inlined Leaflet CSS — no CDN dependency for styles */
    ${LEAFLET_CSS}

    /* Custom marker */
    .lf-bubble{
      background:#fff;
      border:2.5px solid #7C6FFF;
      border-radius:12px;
      width:46px;height:46px;
      display:flex;align-items:center;justify-content:center;
      font-size:24px;
      box-shadow:0 3px 12px rgba(0,0,0,0.22);
      position:relative;
    }
    .lf-bubble::after{
      content:'';position:absolute;bottom:-8px;left:50%;transform:translateX(-50%);
      border-left:7px solid transparent;border-right:7px solid transparent;
      border-top:8px solid #7C6FFF;
    }
    .lf-bubble.sel{border-color:#FF6B9D}
    .lf-bubble.sel::after{border-top-color:#FF6B9D}

    /* "You" dot */
    .lf-you{
      width:16px;height:16px;background:#7C6FFF;border:2.5px solid #fff;
      border-radius:50%;box-shadow:0 0 0 6px rgba(124,111,255,0.22);
    }

    /* Popup override */
    .leaflet-popup-content-wrapper{border-radius:14px!important;padding:0!important}
    .leaflet-popup-content{margin:0!important}
    .lf-popup{padding:12px 16px;min-width:150px}
    .lf-popup-name{font-weight:700;font-size:14px;color:#1a1a2e}
    .lf-popup-sub{font-size:12px;color:#666;margin-top:4px}
    .lf-popup-btn{
      display:block;margin-top:10px;padding:7px 12px;
      background:#7C6FFF;color:#fff;border:none;border-radius:8px;
      font-size:12px;font-weight:700;width:100%;text-align:center;cursor:pointer;
    }
  </style>
</head>
<body>

<div id="map"></div>

<!-- Leaflet JS loaded at end of body so DOM is ready -->
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>

<script>
// Wait until both DOM and Leaflet script are fully loaded
window.addEventListener('load', function() {
  if (typeof L === 'undefined') {
    // Leaflet CDN failed — tell React Native so it can show a fallback
    postRN({ type: 'leafletError', message: 'Leaflet failed to load from CDN' });
    return;
  }

  var MARKERS  = ${JSON.stringify(markers)};
  var USER     = ${JSON.stringify(userCoords ?? null)};
  var CENTER   = [${center.latitude}, ${center.longitude}];
  var ZOOM     = ${zoom};
  var PURPLE   = '#7C6FFF';
  var PINK     = '#FF6B9D';

  // ── Create map ──────────────────────────────────────────────────────────────
  var map = L.map('map', {
    zoomControl: true,
    attributionControl: false,
    tap: false,           // disable tap handler (causes double-fire on mobile)
    tapTolerance: 15,
  }).setView(CENTER, ZOOM);

  // OpenStreetMap tiles — direct URL, no subdomain variable
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    crossOrigin: '',
  }).addTo(map);

  var leafletMarkers = {};
  var selectedId = null;

  // ── Helper: build marker icon ───────────────────────────────────────────────
  function makeIcon(emoji, selected) {
    return L.divIcon({
      className: '',
      html: '<div class="lf-bubble' + (selected ? ' sel' : '') + '">' + emoji + '</div>',
      iconSize:    [46, 54],
      iconAnchor:  [23, 54],
      popupAnchor: [0, -56],
    });
  }

  // ── Add friend / family markers ─────────────────────────────────────────────
  MARKERS.forEach(function(m) {
    var marker = L.marker([m.latitude, m.longitude], { icon: makeIcon(m.emoji, false) });

    var popupHtml =
      '<div class="lf-popup">' +
        '<div class="lf-popup-name">' + esc(m.name) + '</div>' +
        (m.subtitle ? '<div class="lf-popup-sub">' + esc(m.subtitle) + '</div>' : '') +
        '<button class="lf-popup-btn" onclick="openMaps(' + m.latitude + ',' + m.longitude + ',\'' + esc(m.name) + '\')">📍 Open in Maps ↗</button>' +
      '</div>';

    marker.bindPopup(popupHtml, { closeButton: false, maxWidth: 240 });

    marker.on('click', function() {
      if (selectedId && leafletMarkers[selectedId]) {
        var prev = MARKERS.find(function(x){ return x.id === selectedId; });
        if (prev) leafletMarkers[selectedId].setIcon(makeIcon(prev.emoji, false));
      }
      selectedId = m.id;
      marker.setIcon(makeIcon(m.emoji, true));
      postRN({ type: 'markerTap', id: m.id });
    });

    marker.addTo(map);
    leafletMarkers[m.id] = marker;
  });

  // ── Current user dot ────────────────────────────────────────────────────────
  if (USER) {
    L.marker([USER.latitude, USER.longitude], {
      icon: L.divIcon({
        className: '',
        html: '<div class="lf-you"></div>',
        iconSize: [16, 16], iconAnchor: [8, 8],
      }),
      zIndexOffset: 1000,
    })
    .bindPopup('<div class="lf-popup"><div class="lf-popup-name">You</div></div>', { closeButton: false })
    .addTo(map);
  }

  // ── Fit all markers in view ─────────────────────────────────────────────────
  if (MARKERS.length > 1) {
    var all = MARKERS.map(function(m){ return [m.latitude, m.longitude]; });
    if (USER) all.push([USER.latitude, USER.longitude]);
    try { map.fitBounds(L.latLngBounds(all), { padding: [50, 50], maxZoom: 13 }); } catch(e) {}
  }

  // ── Force a resize so tiles fill the container properly ─────────────────────
  setTimeout(function() { map.invalidateSize(); }, 200);

  // ── Receive commands from React Native (flyTo) ──────────────────────────────
  function onMsg(e) {
    try {
      var d = JSON.parse(typeof e.data === 'string' ? e.data : '{}');
      if (d.type === 'flyTo') {
        map.flyTo([d.lat, d.lng], d.zoom || 14, { animate: true, duration: 0.5 });
        var m2 = MARKERS.find(function(x){ return x.id === d.id; });
        if (m2 && leafletMarkers[d.id]) {
          if (selectedId && leafletMarkers[selectedId]) {
            var p2 = MARKERS.find(function(x){ return x.id === selectedId; });
            if (p2) leafletMarkers[selectedId].setIcon(makeIcon(p2.emoji, false));
          }
          selectedId = d.id;
          leafletMarkers[d.id].setIcon(makeIcon(m2.emoji, true));
          leafletMarkers[d.id].openPopup();
        }
      }
    } catch(err) {}
  }
  document.addEventListener('message', onMsg);
  window.addEventListener('message', onMsg);

  // Notify React Native that the map is ready
  postRN({ type: 'ready' });
});

// ── Helpers ──────────────────────────────────────────────────────────────────
function openMaps(lat, lng, name) {
  postRN({ type: 'openMaps', lat: lat, lng: lng, name: name });
}
function postRN(obj) {
  try { window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify(obj)); } catch(e) {}
}
function esc(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
</script>

</body>
</html>`;
}

// ─── React Native Component ───────────────────────────────────────────────────

const LeafletMap = forwardRef<LeafletMapRef, Props>(
  ({ markers, userCoords, onMarkerPress, style }, ref) => {
    const webRef = useRef<any>(null);

    useImperativeHandle(ref, () => ({
      flyTo(lat: number, lng: number, zoom = 14) {
        const js = `
          (function(){
            var e = new MessageEvent('message',{data:JSON.stringify({type:'flyTo',lat:${lat},lng:${lng},zoom:${zoom}})});
            window.dispatchEvent(e);
          })(); true;
        `;
        webRef.current?.injectJavaScript(js);
      },
    }));

    function handleMessage(event: any) {
      try {
        const msg = JSON.parse(event.nativeEvent.data);
        if (msg.type === 'markerTap' && onMarkerPress) {
          onMarkerPress(msg.id);
        }
        if (msg.type === 'openMaps') {
          const encoded = encodeURIComponent(msg.name);
          const url =
            Platform.OS === 'ios'
              ? `maps:?ll=${msg.lat},${msg.lng}&q=${encoded}`
              : `geo:${msg.lat},${msg.lng}?q=${msg.lat},${msg.lng}(${encoded})`;
          Linking.openURL(url).catch(() => {});
        }
      } catch {}
    }

    const html = buildHtml(markers, userCoords);

    return (
      <WebView
        ref={webRef}
        // baseUrl: 'http://localhost' gives Android WebView a proper HTTP origin,
        // which allows it to load external resources (Leaflet CDN, OSM tiles).
        source={{ html, baseUrl: 'http://localhost' }}
        style={[styles.map, style]}
        onMessage={handleMessage}
        javaScriptEnabled
        domStorageEnabled
        originWhitelist={['*']}
        mixedContentMode="always"
        allowFileAccess
        allowUniversalAccessFromFileURLs
        scrollEnabled={false}
        bounces={false}
        overScrollMode="never"
        showsHorizontalScrollIndicator={false}
        showsVerticalScrollIndicator={false}
        cacheEnabled
        cacheMode="LOAD_DEFAULT"
      />
    );
  },
);

export default LeafletMap;

const styles = StyleSheet.create({
  map: { flex: 1 },
});
