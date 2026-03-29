<?php
include_once __DIR__.'/include.php';
include_once __DIR__.'/lib/Mail.php';

class Mail
{
	private $host;
	private $username;
	private $password;
	private $from;
	private $mail;
	
	public function __construct($config)
    {
        $this->host = $config['host'];
		$this->username = $config['username'];
		$this->password = $config['password'];
		$this->from = $config['from'];		
    }
	
	public function sendCode($to, $code)
	{
		$subject = "GasLog authentication code";
		$bodyHtml = "You requested an authentication code from GasLog website.<br/>Your code is <tt>$code</tt><br/>";
		$bodyAlt = "You requested an authentication code from GasLog website.\nYour code is\n$code\n<br/>";
		return $this->send($to, $subject, $bodyHtml, $bodyAlt);
	}
	private function send($to, $subject, $bodyHtml, $bodyAlt)
	{
		return PHPMailerSend(
			$this->host, $this->username, $this->password, 
			$this->from, "GasLog registration", 
			$to, $to, 
			$subject, $bodyHtml, $bodyAlt
		);
	}
}