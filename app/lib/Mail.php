<?php
use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

require 'vendor/autoload.php';

function PHPMailerSend($host, $username, $password, 
	$from, $fromName, $to, $toName,
	$subject,
	$bodyHtml, $bodyAlt)
{
	$mail = new PHPMailer(true);
	$mail->isSMTP();
	$mail->Host       = $host;
	$mail->SMTPAuth   = true;
	$mail->Username   = $username;
	$mail->Password   = $password;
	$mail->SMTPSecure = 'tls';
	$mail->Port       = 587;

	$mail->setFrom($from, $fromName);
	$mail->addAddress($to, $toName);

	$mail->isHTML(true);
	$mail->Subject = $subject;
	$mail->Body    = $bodyHtml;
	$mail->AltBody = $bodyAlt;

	return $mail->send();
}
/**
$mail = new PHPMailer(true);

try {
    $mail->isSMTP();
    $mail->Host       = 'smtp.galae.net';
    $mail->SMTPAuth   = true;
    $mail->Username   = 'xxxxx@xxxxx.xyz';
    $mail->Password   = 'xxxxx';
    $mail->SMTPSecure = 'tls';
    $mail->Port       = 587;

    $mail->setFrom('xxxx@xxxx.xyz', 'Mailer');
    $mail->addAddress('xxxx@xxxx.xyz', 'Joe User');

    $mail->isHTML(true);
    $mail->Subject = 'Here is the subject';
    $mail->Body    = 'This is the HTML message body <b>in bold!</b>';
    $mail->AltBody = 'This is the plain text version';

    $mail->send();
    echo 'Message has been sent';
} catch (Exception $e) {
    echo "Message could not be sent. Mailer Error: {$mail->ErrorInfo}\n";
}
**/
?>
