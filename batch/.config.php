<?php

global $CONFIG;

$CONFIG['dbstations']['type'] = 'sqlite';
$CONFIG['dbstations']['dsn'] = 'sqlite:'.__DIR__.'/../data/stations.sqlite';
$CONFIG['dbstations']['dbuser'] = null;
$CONFIG['dbstations']['dbpassword'] = null;
