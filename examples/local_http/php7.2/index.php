<?php
use RingCentral\Psr7\Response;
function handler($request, $context): Response{
    /*
    $body       = $request->getBody()->getContents();
    $queries    = $request->getQueryParams();
    $method     = $request->getMethod();
    $headers    = $request->getHeaders();
    $path       = $request->getAttribute("path");
    $requestURI = $request->getAttribute("requestURI");
    $clientIP   = $request->getAttribute("clientIP");
    */
    return new Response(
        200,
        array(
            "Content-Type" => "application/json"
        ),
        json_encode(array(
            "queries" => $request->getQueryParams(),
            "method" => $request->getMethod(),
            "headers" => $request->getHeaders(),
            "path" => $request->getAttribute("path"),
            "requestURI" => $request->getAttribute("requestURI"),
            "clientIP" => $request->getAttribute("clientIP"),
            "body" => $request->getBody()->getContents()
        ))
    );
}