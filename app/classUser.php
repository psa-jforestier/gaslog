<?php

include_once __DIR__.'/include.php';

class User
{
    public $db;
    public function __construct($db)
    {
        $this->db = $db->pdo;
    }

    public function isLogged()
    {
        /**
        @session_start();
        if (isset($_SESSION['user_id'])) {
            return true;
        }
        return false;
        **/
        return false;
    }

    /**
     * Return the user information, or false if the userhash does not exists
     */
    public function getUserInfoByUserHash($userhash)
    {
        $stmt = $this->db->prepare("select * from user where userhash = :userhash");
        $stmt->execute(['userhash' => $userhash]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);
        if ($user) {
            return $user;
        }
        return false;
    }

    /**
     * Return user info. If wrong user, fails with an HTTP error
     */
    function getUserInfoByUserHashOrFail($userhash)
    {
        if ($userhash == '')
        {
            echo json_encode(['success' => false, 'message' => 'Userhash is required']);
            exit;
        }
        $user = $this->getUserInfoByUserHash($userhash);
        if (!$user) {
            echo json_encode(['success' => false, 'message' => 'Invalid user']);
            exit;
        }
        return $user;
    }

    /**
     * Log in the user, return false if not exists or the user info
     */
    public function login($email)
    {
        $now = Database::NOW();
        $stmt = $this->db->prepare("update user set logged_date = :now where email = :email");
        $stmt->execute(['email' => $email, 'now' => $now]);
        $r = $stmt->rowCount();
        if ($r == 0)
        {
            return false; // user does not exist
        }
        
        // Get the user id and all other info
        $stmt = $this->db->prepare("select * from user where email = :email");
        $stmt->execute(['email' => $email]);
        $user = $stmt->fetch();
        return $user;
    }

    public function confirmUser($email, $name)
    {
        // Set the user as confirmed by setting the auth_code to null
        $now = Database::NOW();
        if ($name != '')
        {
            $stmt = $this->db->prepare("update user set auth_code = null, name=:name, validation_date=:confirmed_date where email = :email");
            $stmt->execute(['email' => $email, 'name'=>$name, 'confirmed_date' => $now]);
        }
        else
        {
            $stmt = $this->db->prepare("update user set auth_code = null, validation_date=:confirmed_date where email = :email");
            $stmt->execute(['email' => $email, 'confirmed_date' => $now]);
        }
    }
    /**
     * Return true if the code is valid for the email, false otherwise. The code is valid if it exists in the database and is not expired (we can set an expiration time of 15 minutes for example).
     */
    public function checkAuthCode($email, $code)
    {
       $stmt = $this->db->prepare("select count(*) from user where email = :email and auth_code = :code");
       $stmt->execute(['email' => $email, 'code' => $code]);
       $user = $stmt->fetch();
       if ($user[0] > 0) {
           return true;
       }
       return false;
    }

    /**
     * Generate a random 6 digits code, save it in the database 
     * with the email 
     */
    public function generateAuthCode($email, $name)
    {
        
        // Generate a random 6 digits code
        $code = rand(100000, 999999);
        // check if the user already exists
        
        $stmt = $this->db->prepare("select count(*) from user where email = :email");
        $stmt->execute(['email' => $email]);
        $user = $stmt->fetch();
        
        if ($user[0] > 0) {
            // If the user already exists, we update the code
            $stmt = $this->db->prepare("update user set auth_code = :code  where email = :email");
            $stmt->execute(['email' => $email, 'code' => $code]);
        } else {
            // If the user does not exist, we create a new user with the code and the expiration date
            $now = Database::NOW();

            $stmt = $this->db->prepare("insert into user (email, auth_code, created_date, name, userhash) values (:email, :code, :created_date, :name, :userhash)");
            $stmt->execute(['email' => $email, 'code' => $code, 'created_date' => $now, 'name' => $name, 'userhash' => hash('md5', $email . '!'. $now)]);
        }
        // Send the code to the user's email (this is a mockup, so we will just return the code)
        return $code;
    }

    function deleteUser($userid)
    {
        $stmt = $this->db->prepare("delete from user where id = :userid");
        $stmt->execute(['userid' => $userid]);
        return true;
    }
}