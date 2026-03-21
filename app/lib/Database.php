<?php

class Database
{
  var $pdo;
  private static $_instance = null;
  private function __construct($dsn, $user, $password)
  {

    $this->pdo = new \PDO($dsn, $user, $password);
    $this->pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
  }
  
  public static function initInstance($dsn, $user, $password)
  {
    self::$_instance = new Database($dsn, $user, $password);
  }
  public static function getInstance($dsn = NULL, $user = NULL, $password = NULL)
  {
    if(is_null(self::$_instance)) 
    {
       self::$_instance = new Database($dsn, $user, $password);
    }
 
    return self::$_instance;
  }
  
  public static function NOW()
  {
    //return date(DATE_RFC3339);//'Y-M-D H:i:s');
    return date('Y-m-d H:i:s');//'Y-M-D H:i:s');
  }

  public function query($sql, $params = [])
  {

      $stmt = $this->pdo->prepare($sql);
      $stmt->execute($params);
      return $stmt;
  }

  public function rawQuery($sql)
  {
      return $this->pdo->query($sql);
  }

  public function multipleQuery($sql)
  {
    $statements = explode(';', $sql);
    foreach ($statements as $statement) {
        
        $statement = trim($statement);
        if ($statement) {
            $this->rawQuery($statement);
        }
    }
  }
  
  
}


