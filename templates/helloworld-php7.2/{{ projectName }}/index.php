<?php

/*
if you open the initializer feature, please implement the initializer function, as below:
function initializer($context) {
  $logger = $GLOBALS['fcLogger'];
	$logger->info("initializing");
}
*/

function handler($event, $context) {
  $logger = $GLOBALS['fcLogger'];
	$logger->info("hello world");
	return "hello world";
}