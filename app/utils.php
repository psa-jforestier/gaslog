<?php
/** utilitary functions */

function DIE_WITH_ERROR(
    $http_code = 500,
    $message = 'An error occurred',
    $next = 'index.html'
)
{
    http_response_code($http_code);
    ?>
    <html><body>
        <h1>Error <?=$http_code?></h1>
        <p><?php echo htmlspecialchars($message); ?></p>
        <a href="<?php echo htmlspecialchars($next); ?>">Go back</a>
    </body></html>
    <?php
    die();
}