<?php

global $CONFIG;

$CONFIG['db']['type'] = 'sqlite';
$CONFIG['db']['dsn'] = 'sqlite:'.__DIR__.'/../data/gaslog.db';
$CONFIG['db']['dbuser'] = null;
$CONFIG['db']['dbpassword'] = null;

$CONFIG['app']['maxstation'] = 10; // maximum number of station per user
$CONFIG['app']['maxvehicle'] =  5; // maximum number of vehicle per user

