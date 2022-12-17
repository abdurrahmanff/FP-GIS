/**
 * @license
 * Copyright 2019 Google LLC. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import * as sensus from "./data/sensus.json";
import * as provinceGeoJson from "./data/indonesia-province.json";

const mapStyle: google.maps.MapTypeStyle[] = [
  {
    stylers: [{ visibility: "off" }],
  },
  {
    featureType: "landscape",
    elementType: "geometry",
    stylers: [{ visibility: "on" }, { color: "#fcfcfc" }],
  },
  {
    featureType: "water",
    elementType: "geometry",
    stylers: [{ visibility: "on" }, { color: "#bfd4ff" }],
  },
];
let map: google.maps.Map;

let censusMin = Number.MAX_VALUE,
  censusMax = -Number.MAX_VALUE;

function initMap(): void {
  // load the map
  map = new google.maps.Map(document.getElementById("map") as HTMLElement, {
    center: { lat: -2.4621022546283413, lng: 120.97310639576743 },
    zoom: 5.5,
    styles: mapStyle,
  });

  // set up the style rules and events for google.maps.Data
  map.data.setStyle(styleFeature);
  map.data.addListener("mouseover", mouseInToRegion);
  map.data.addListener("mouseout", mouseOutOfRegion);

  const selectBox = document.getElementById(
    "census-variable"
  ) as HTMLSelectElement;

  // console.log(selectBox.options[selectBox.selectedIndex].value);
  google.maps.event.addDomListener(selectBox, "change", () => {
    clearCensusData();
    loadCensusData(selectBox.options[selectBox.selectedIndex].value);
  });

  loadMapShapes();
}

/** Loads the state boundary polygons from a GeoJSON source. */
function loadMapShapes() {
  // load US state outline polygons from a GeoJson file
  map.data.addGeoJson(provinceGeoJson, {
    idPropertyName: "kode",
  });

  google.maps.event.addListenerOnce(map.data, "addfeature", () => {
    google.maps.event.trigger(
      document.getElementById("census-variable") as HTMLElement,
      "change"
    );
  });
}

function clearCensusData() {
  censusMin = Number.MAX_VALUE;
  censusMax = -Number.MAX_VALUE;
  map.data.forEach((row) => {
    row.setProperty("census_variable", undefined);
  });
  (document.getElementById("data-box") as HTMLElement).style.display = "none";
  (document.getElementById("data-caret") as HTMLElement).style.display = "none";
}

/**
 * Loads the census data from a simulated API call to the US Census API.
 *
 * @param {string} variable
 */
function loadCensusData(variable: string) {
  const censusData = sensus as any;
  censusData.data.forEach((row: any) => {
    const stateId = row.kode_wilayah;
    // console.log(stateId);
    const state = map.data.getFeatureById(stateId);
    // console.log(state);
    if (state && row.kode_item_kategori_1 == variable) {
      // console.log(state.getProperty("Propinsi") + ": " + row.nilai);
      const value = row.nilai / 1000;
      state.setProperty("census_variable", value);

      if (value < censusMin) {
        censusMin = value;
      }

      if (value > censusMax) {
        censusMax = value;
      }
    }
  });

  (document.getElementById("census-min") as HTMLElement).textContent =
    censusMin.toLocaleString();
  (document.getElementById("census-max") as HTMLElement).textContent =
    censusMax.toLocaleString();
}

function styleFeature(feature: google.maps.Data.Feature) {
  const high = [5, 69, 54]; // color of smallest datum
  const low = [151, 83, 34]; // color of largest datum

  const value = feature.getProperty("census_variable");

  const delta = (value - censusMin) / (censusMax - censusMin);

  const color: number[] = [];

  for (let i = 0; i < 3; i++) {
    color.push((high[i] - low[i]) * delta + low[i]);
  }

  let showRow = true;

  if (value == null || isNaN(value)) {
    showRow = false;
  }

  let outlineWeight = 0.5,
    zIndex = 1;

  if (feature.getProperty("state") === "hover") {
    outlineWeight = zIndex = 2;
  }

  return {
    strokeWeight: outlineWeight,
    strokeColor: "#fff",
    zIndex: zIndex,
    fillColor: "hsl(" + color[0] + "," + color[1] + "%," + color[2] + "%)",
    fillOpacity: 0.75,
    visible: showRow,
  };
}

/**
 * Responds to the mouse-in event on a map shape (state).
 *
 * @param {?google.maps.MapMouseEvent} e
 */
function mouseInToRegion(e: any) {
  // set the hover state so the setStyle function can change the border
  const value = e.feature.getProperty("census_variable");
  const percent = ((value - censusMin) / (censusMax - censusMin)) * 100;

  e.feature.setProperty("state", "hover");
  (document.getElementById("data-label") as HTMLElement).textContent =
    e.feature.getProperty("Propinsi");
  (document.getElementById("data-value") as HTMLElement).textContent =
    value.toLocaleString() + " ribu orang";
  (document.getElementById("data-box") as HTMLElement).style.display = "block";
  (document.getElementById("data-caret") as HTMLElement).style.display =
    "block";
  (document.getElementById("data-caret") as HTMLElement).style.paddingLeft =
    percent + "%";
}

/**
 * Responds to the mouse-out event on a map shape (state).
 *
 */
function mouseOutOfRegion(e: any) {
  // reset the hover state, returning the border to normal
  e.feature.setProperty("state", "normal");
}

declare global {
  interface Window {
    initMap: () => void;
  }
}
window.initMap = initMap;
export {};
