if (-not [System.Net.HttpListener]::IsSupported) {
    "HttpListener is not supported."
    exit 1
}

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://+:9000/")

try {
    $listener.Start()
    Write-Output  "FunctionCompute powershell runtime inited." 
} catch {
    "Unable to start listener."
    exit 1
}

while ($listener.IsListening) {
   
    $context = $listener.GetContext()
    $requestID = $context.Request.Headers["x-fc-request-id"]
    
    Write-Output "FC Invoke Start RequestId: $requestID" 

    # do your logic here
    $body = $context.Request.InputStream
    $reader = New-Object System.IO.StreamReader($body, $context.Request.ContentEncoding)
    $s = $reader.ReadToEnd()
    Write-Output $s

    $response = $context.Response
    $response.ContentType = "application/octet-stream"
    $content = [System.Text.Encoding]::UTF8.GetBytes($s)
    $response.OutputStream.Write($content, 0, $content.Length)
    $response.Close()

    Write-Output "FC Invoke End RequestId: $requestID" 
}

$listener.Stop()