import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Copy, Code, Book, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export function ApiDocumentation() {
    const { toast } = useToast();
    const [activeTab, setActiveTab] = useState("overview");

    const copyCode = (code: string) => {
        navigator.clipboard.writeText(code);
        toast({ title: "Copied!", description: "Code copied to clipboard" });
    };

    const apiUrl = `${window.location.origin}/functions/v1/send-sms`;

    return (
        <div className="space-y-6">
            <div>
                <h1 className="font-display text-2xl font-bold mb-2">API Documentation</h1>
                <p className="text-muted-foreground">Complete guide to integrating our SMS API into your applications</p>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="examples">Code Examples</TabsTrigger>
                    <TabsTrigger value="errors">Error Codes</TabsTrigger>
                    <TabsTrigger value="limits">Rate Limits</TabsTrigger>
                </TabsList>

                {/* Overview Tab */}
                <TabsContent value="overview" className="space-y-4">
                    <Card className="glass">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Book className="h-5 w-5 text-primary" />
                                API Endpoint
                            </CardTitle>
                            <CardDescription>Send SMS messages programmatically using our REST API</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <h3 className="font-semibold mb-2">Base URL</h3>
                                <div className="bg-muted rounded-lg p-3 font-mono text-sm flex items-center justify-between">
                                    <code>{apiUrl}</code>
                                    <Button size="sm" variant="ghost" onClick={() => copyCode(apiUrl)}>
                                        <Copy className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>

                            <div>
                                <h3 className="font-semibold mb-2">Authentication</h3>
                                <p className="text-sm text-muted-foreground mb-2">
                                    Include your API key in the request header:
                                </p>
                                <div className="bg-muted rounded-lg p-3 font-mono text-sm">
                                    <code>x-api-key: YOUR_API_KEY</code>
                                </div>
                            </div>

                            <div>
                                <h3 className="font-semibold mb-2">Request Method</h3>
                                <Badge className="bg-primary/10 text-primary border-primary/20">POST</Badge>
                            </div>

                            <div>
                                <h3 className="font-semibold mb-2">Request Body</h3>
                                <div className="bg-muted rounded-lg p-3 font-mono text-sm">
                                    <pre>{`{
  "to": "9812345678",
  "text": "Your message here"
}`}</pre>
                                </div>
                                <div className="mt-2 space-y-1">
                                    <p className="text-sm"><strong>to</strong>: Phone number(s) - comma-separated for multiple</p>
                                    <p className="text-sm"><strong>text</strong>: Message content (max 160 chars for single SMS)</p>
                                </div>
                            </div>

                            <div>
                                <h3 className="font-semibold mb-2">Response Format</h3>
                                <div className="bg-muted rounded-lg p-3 font-mono text-sm">
                                    <pre>{`{
  "error": false,
  "message": "SMS sent successfully",
  "data": {
    "smsCount": 1,
    "cost": 1.50
  }
}`}</pre>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Code Examples Tab */}
                <TabsContent value="examples" className="space-y-4">
                    {/* cURL Example */}
                    <Card className="glass">
                        <CardHeader>
                            <CardTitle className="flex items-center justify-between">
                                <span className="flex items-center gap-2">
                                    <Code className="h-5 w-5 text-primary" />
                                    cURL
                                </span>
                                <Button size="sm" variant="outline" onClick={() => copyCode(curlExample)}>
                                    <Copy className="h-4 w-4 mr-2" /> Copy
                                </Button>
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="bg-muted rounded-lg p-4 font-mono text-sm overflow-x-auto">
                                <pre>{curlExample}</pre>
                            </div>
                        </CardContent>
                    </Card>

                    {/* JavaScript Example */}
                    <Card className="glass">
                        <CardHeader>
                            <CardTitle className="flex items-center justify-between">
                                <span className="flex items-center gap-2">
                                    <Code className="h-5 w-5 text-primary" />
                                    JavaScript (Fetch API)
                                </span>
                                <Button size="sm" variant="outline" onClick={() => copyCode(jsExample)}>
                                    <Copy className="h-4 w-4 mr-2" /> Copy
                                </Button>
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="bg-muted rounded-lg p-4 font-mono text-sm overflow-x-auto">
                                <pre>{jsExample}</pre>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Python Example */}
                    <Card className="glass">
                        <CardHeader>
                            <CardTitle className="flex items-center justify-between">
                                <span className="flex items-center gap-2">
                                    <Code className="h-5 w-5 text-primary" />
                                    Python (Requests)
                                </span>
                                <Button size="sm" variant="outline" onClick={() => copyCode(pythonExample)}>
                                    <Copy className="h-4 w-4 mr-2" /> Copy
                                </Button>
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="bg-muted rounded-lg p-4 font-mono text-sm overflow-x-auto">
                                <pre>{pythonExample}</pre>
                            </div>
                        </CardContent>
                    </Card>

                    {/* PHP Example */}
                    <Card className="glass">
                        <CardHeader>
                            <CardTitle className="flex items-center justify-between">
                                <span className="flex items-center gap-2">
                                    <Code className="h-5 w-5 text-primary" />
                                    PHP (cURL)
                                </span>
                                <Button size="sm" variant="outline" onClick={() => copyCode(phpExample)}>
                                    <Copy className="h-4 w-4 mr-2" /> Copy
                                </Button>
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="bg-muted rounded-lg p-4 font-mono text-sm overflow-x-auto">
                                <pre>{phpExample}</pre>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Error Codes Tab */}
                <TabsContent value="errors">
                    <Card className="glass">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <AlertCircle className="h-5 w-5 text-primary" />
                                Error Codes Reference
                            </CardTitle>
                            <CardDescription>Common error responses and their meanings</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {errorCodes.map((error) => (
                                    <div key={error.code} className="border-l-4 border-destructive pl-4 py-2">
                                        <div className="flex items-center gap-2 mb-1">
                                            <Badge variant="destructive">{error.code}</Badge>
                                            <span className="font-semibold">{error.title}</span>
                                        </div>
                                        <p className="text-sm text-muted-foreground mb-2">{error.description}</p>
                                        <div className="bg-muted rounded p-2 font-mono text-xs">
                                            <code>{error.example}</code>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Rate Limits Tab */}
                <TabsContent value="limits">
                    <Card className="glass">
                        <CardHeader>
                            <CardTitle>Rate Limits & Best Practices</CardTitle>
                            <CardDescription>Guidelines for optimal API usage</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <h3 className="font-semibold mb-2">Rate Limits</h3>
                                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                                    <li>Maximum 100 requests per minute per API key</li>
                                    <li>Maximum 1000 SMS per day per account</li>
                                    <li>Bulk sending: Up to 100 numbers per request (comma-separated)</li>
                                </ul>
                            </div>

                            <div>
                                <h3 className="font-semibold mb-2">Best Practices</h3>
                                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                                    <li>Always check your balance before sending SMS</li>
                                    <li>Implement exponential backoff for failed requests</li>
                                    <li>Store API keys securely (never in client-side code)</li>
                                    <li>Use environment variables for API keys in production</li>
                                    <li>Monitor your SMS logs regularly</li>
                                    <li>Validate phone numbers before sending</li>
                                </ul>
                            </div>

                            <div>
                                <h3 className="font-semibold mb-2">Message Guidelines</h3>
                                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                                    <li>Single SMS: Up to 160 characters</li>
                                    <li>Longer messages will be split (charged per segment)</li>
                                    <li>Avoid blacklisted words (will be rejected)</li>
                                    <li>Include opt-out instructions for marketing messages</li>
                                </ul>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}

// Code Examples
const curlExample = `curl -X POST ${window.location.origin}/functions/v1/send-sms \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: YOUR_API_KEY" \\
  -d '{
    "to": "9812345678",
    "text": "Hello from SMS API!"
  }'`;

const jsExample = `const sendSMS = async () => {
  const response = await fetch('${window.location.origin}/functions/v1/send-sms', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': 'YOUR_API_KEY'
    },
    body: JSON.stringify({
      to: '9812345678',
      text: 'Hello from SMS API!'
    })
  });
  
  const data = await response.json();
  console.log(data);
};

sendSMS();`;

const pythonExample = `import requests

url = '${window.location.origin}/functions/v1/send-sms'
headers = {
    'Content-Type': 'application/json',
    'x-api-key': 'YOUR_API_KEY'
}
payload = {
    'to': '9812345678',
    'text': 'Hello from SMS API!'
}

response = requests.post(url, json=payload, headers=headers)
print(response.json())`;

const phpExample = `<?php
$url = '${window.location.origin}/functions/v1/send-sms';
$data = array(
    'to' => '9812345678',
    'text' => 'Hello from SMS API!'
);

$ch = curl_init($url);
curl_setopt($ch, CURLOPT_POST, 1);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, array(
    'Content-Type: application/json',
    'x-api-key: YOUR_API_KEY'
));

$response = curl_exec($ch);
curl_close($ch);

echo $response;
?>`;

// Error Codes
const errorCodes = [
    {
        code: 400,
        title: "Bad Request",
        description: "Missing required parameters or invalid data format",
        example: '{ "error": true, "message": "Missing \'to\' or \'text\'" }'
    },
    {
        code: 401,
        title: "Unauthorized",
        description: "Invalid or missing API key",
        example: '{ "error": true, "message": "Invalid or inactive API key" }'
    },
    {
        code: 403,
        title: "Forbidden",
        description: "Account is inactive or suspended",
        example: '{ "error": true, "message": "Account inactive" }'
    },
    {
        code: 400,
        title: "Insufficient Balance",
        description: "Not enough balance to send SMS",
        example: '{ "error": true, "message": "Insufficient balance" }'
    },
    {
        code: 400,
        title: "Blacklisted Content",
        description: "Message contains blocked words",
        example: '{ "error": true, "message": "Message contains blocked content" }'
    },
    {
        code: 500,
        title: "Server Error",
        description: "Internal server error or SMS service unavailable",
        example: '{ "error": true, "message": "SMS service not configured" }'
    }
];
