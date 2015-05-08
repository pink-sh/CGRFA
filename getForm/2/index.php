<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin:*');

echo file_get_contents("/var/www/html/cgrfa/getForm/2/outTest.json");
?>
