<?php

/**
 * Simple translation function
 */
$T['fr']['GasLog - Fuel Tracking'] = 'GasLog - Suivi de Carburant';
$T['fr']['Welcome to GasLog !<br/>You are using the application in invitee mode. Go to the Menu, then Login to create an account.'] = 'Bienvenue sur GasLog !<br/>Vous utilisez l\'application en mode invité. Allez dans le Menu, puis Login pour créer un compte.';
$T['fr']['But you can use the app unconnected, all the data will be stored to the local storage.'] = 'Mais vous pouvez utiliser l\'application sans être connecté, toutes les données sont dans le stockage local.';
global $language;
global $T;
function T_setLanguage($lang) {
    global $language;
    $language = $lang;
}
function T($key) {
    global $language;
    global $T;
    if ($language == 'en')
        return $key; // Assuming en is the default language
    // Another language
    if (isset($T[$language][$key])) {
        return $T[$language][$key];
    } else {
        // Key does not exist in the translation array, return the key itself as a fallback with warning sign
        return "!👄!".$key;
    }
}