<?php

class Language
{
    public function __construct()
    {
    }

    public static function getCurrentLanguage()
    {
        // Check in query string
        // then in cookie,
        // then in browser settings
        global $CONFIG;
        $lang = @$_REQUEST['lang'];
        if ($lang == '') {
            $lang = @$_COOKIE['lang'];
        } 
        if ($lang == '') {
            $lang = substr($_SERVER['HTTP_ACCEPT_LANGUAGE'], 0, 2);
        }       
        if (in_array($lang, $CONFIG['app']['languages'])) {
            return $lang;
        }
        return 'en'; // default lang
    }
}