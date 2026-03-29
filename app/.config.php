<?php

global $CONFIG;

$CONFIG['db']['type'] = 'sqlite';
$CONFIG['db']['dsn'] =        'sqlite:'.__DIR__.'/../data/gaslog.db';
$CONFIG['db']['dbuser'] = null;
$CONFIG['db']['dbpassword'] = null;

$CONFIG['dbstations']['type'] = 'sqlite';
$CONFIG['dbstations']['dsn'] = 'sqlite:'.__DIR__.'/../data/stations.sqlite';
$CONFIG['dbstations']['dbuser'] = null;
$CONFIG['dbstations']['dbpassword'] = null;

$CONFIG['app']['maxstation'] = 10; // maximum number of station per user
$CONFIG['app']['maxvehicle'] =  5; // maximum number of vehicle per user

// Some consts
$CONFIG['app']['version'] = '0.1.0';
$CONFIG['app']['languages'] = ['en', 'fr'];

if (file_exists(dirname(__FILE__).'/.config.mail.php'))
{
	include_once(dirname(__FILE__).'/.config.mail.php');
}
