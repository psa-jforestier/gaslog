<?php
/**
 * Use this script to intialize the app, for example to create the database if it does not exist
 */

include_once __DIR__.'/include.php';

$db = Database::getInstance($CONFIG['db']['dsn'], $CONFIG['db']['dbuser'], $CONFIG['db']['dbpassword']);
if (@$_REQUEST['confirm'] == '1') {
    $type = $CONFIG['db']['type'];
    $sqlScript = file_get_contents(__DIR__.'/../schema.'.$type.'.sql');
    $db->multipleQuery($sqlScript);
    echo 'Database created successfully ! <a href="index.php">Go to the main screen</a>';
    exit;
}

// Check if the database exists, if not create it
$to_create = false;
try {  
    $db->query('SELECT 1 FROM user LIMIT 1');
    } catch (Exception $e) 
    {
        $to_create = true;
    }

?>
<html>
    <?php 
    if ($to_create === true) {
?>
Database not existing.<br/>
I will create it with the following settings : <br/>
- type : <?= $CONFIG['db']['type'] ?><br/>
- dsn : <?= $CONFIG['db']['dsn'] ?><br/>
<a href="init.php?confirm=1">Click here to confirm</a>
<?php
    }
?>    
  
</html>

