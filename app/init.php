<?php
/**
 * Use this script to intialize the app, for example to create the database if it does not exist
 */

include_once __DIR__.'/include.php';

function isDbExists($dsn, $dbuser, $dbpassword) {

    try {
        $db = Database::getInstance($dsn, $dbuser, $dbpassword);
        $db->query('SELECT 1 FROM user LIMIT 1');
        return true;
    } catch (Exception $e) {
        return false;
    }
}

if (@$_REQUEST['confirm'] == '1') 
{
    $to_create = !isDbExists($CONFIG['db']['dsn'], $CONFIG['db']['dbuser'], $CONFIG['db']['dbpassword']);
    if ($to_create === false) {
        echo 'Database already exists ! <a href="index.php">Go to the main screen</a>';
        exit;
    }
    echo "Creating database...<br/>";
    $type = $CONFIG['db']['type'];
    $sqlScript = file_get_contents(__DIR__.'/../schema.'.$type.'.sql');
    $db->multipleQuery($sqlScript);
    echo 'Database created successfully ! <a href="index.php">Go to the main screen</a>';
    exit;
}

// Check if the database exists, if not create it
$to_create = !isDbExists($CONFIG['db']['dsn'], $CONFIG['db']['dbuser'], $CONFIG['db']['dbpassword']);


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

