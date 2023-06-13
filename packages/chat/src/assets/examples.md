## Examples

-----

In all the examples below ensure that we have the access token set as environment variable PSCHATACCESSTOKEN

Get a list of models
```bash

$ curl -H "Authorization: Bearer $PSCHATACCESSTOKEN" http://localhost:3000/api/chat/models
```

output
```javascript
{
  "data":[
    {"id":"gpt35turbo","name":"GPT 3.5 Turbo","group":"Standard","enabled":true,"contexts":[],"tools":[],"tokencontextlength":4097},
    {"id":"gpt4","name":"GPT 4","group":"Standard","enabled":true,"contexts":[],"tools":[],"tokencontextlength":8000},
    {"id":"psbodhi","name":"PSBodhi","group":"Custom","tools":[],
      "contexts":[
        {"id":"test_india_policies_ca3485df_f2cc_4bad_9ae8_25517a564929","name":"India Policies","description":"PF, Leave, Salary, Holidays, Paternity Maternity, Vacation policies etc.","enabled":true},
      ]
    },
    {"id":"basicagent1","name":"GPT3.5 with Tools","group":"Experimental","enabled":true,"contexts":[],"tools":[]}]}
```

Create a new chat session and get a response
```bash
$ curl -H "Authorization: Bearer $PSCHATACCESSTOKEN"  --header "Content-Type: application/json" \
  --request POST \
  --data '{"message":"Give a example of POST call using curl","options": {"model": "gpt35turbo"}}' \
  http://localhost:3000/api/chat
```

output
```javascript
{
  "data":{
    "id":"bf9f6e52-5ea5-4dae-8b43-d0e39229b378",
    "userid":"rakesh.ravuri@publicissapient.com",
    "name":"Give a example of POST call using curl",
    "type":"private",
    "tags":[],
    "createdAt":"2023-06-13T08:53:36.838Z",
    "updatedAt":"2023-06-13T08:53:36.838Z",
    "options":{
      "model":"gpt35turbo",
      "usage":{
        "total_tokens":174,"prompt_tokens":27,"completion_tokens":147
      },
      "contexts":[]
    },
    "messages":[
      {
        "id":1043,
        "role":"system","content":"You are a helpful assistant.",
        "options":{},
        "index":0,
        "createdAt":"2023-06-13T08:53:36.778Z",
        "updatedAt":"2023-06-13T08:53:36.778Z"
      },
      {
        "id":1044,
        "role":"user",
        "content":"Give a example of POST call using curl",
        "options":{
          "model":"gpt35turbo",
          "contexts":[]
        },
        "index":1,
        "createdAt":"2023-06-13T08:53:36.778Z",
        "updatedAt":"2023-06-13T08:53:36.778Z"
      },
      {
        "id":1045,
        "role":"assistant",
        "content":"Sure, here's an example of making a POST request using curl:\n\n```\ncurl --request POST \\\n--header 'Content-Type: application/json' \\\n--data '{\"example\": \"data\"}' \\\nhttps://example.com/api-endpoint\n```\n\nIn this example, we're sending a JSON payload as the data in the POST request to the specified API endpoint. The `--header` option specifies the content type, and the `--request POST` option tells curl to make a POST request. \n\nYou'll need to replace the URL with the actual endpoint you're trying to hit. Note that this is just a basic example and you may need to provide additional headers or data depending on the specific API you're working with.",
        "options":{"skippedcount":0,"finish_reason":"stop"},
        "index":2,
        "createdAt":"2023-06-13T08:53:36.778Z",
        "updatedAt":"2023-06-13T08:53:36.778Z"
      }
    ]
  },
  "message":"done"
}
```
