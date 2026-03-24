<?php

global $CONFIG;

$CONFIG['dbstation']['type'] = 'sqlite';
$CONFIG['dbstation']['dsn'] = 'sqlite:'.__DIR__.'/../data/stations.sqlite';
$CONFIG['dbstation']['dbuser'] = null;
$CONFIG['dbstation']['dbpassword'] = null;
