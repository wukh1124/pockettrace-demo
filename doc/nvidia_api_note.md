# Nivdia Nim API

## URL Models List
> https://integrate.api.nvidia.com/v1/models
> 需Bearer Token

## 返回例子
```
{
  "object": "list",
  "data": [
        {
        "id": "minimaxai/minimax-m2.5",
        "object": "model",
        "created": 735790403,
        "owned_by": "minimaxai"
        },
        {
        "id": "minimaxai/minimax-m2.7",
        "object": "model",
        "created": 735790403,
        "owned_by": "minimaxai"
        },
        {
            "id": "moonshotai/kimi-k2-instruct",
            "object": "model",
            "created": 735790403,
            "owned_by": "moonshotai"
        },
        {
            "id": "deepseek-ai/deepseek-v4-flash",
            "object": "model",
            "created": 735790403,
            "owned_by": "deepseek-ai"
        },
        {
            "id": "z-ai/glm4.7",
            "object": "model",
            "created": 735790403,
            "owned_by": "z-ai"
        },
        {
            "id": "z-ai/glm5",
            "object": "model",
            "created": 735790403,
            "owned_by": "z-ai"
        },
        {
            "id": "meta/llama-3.2-90b-vision-instruct",
            "object": "model",
            "created": 735790403,
            "owned_by": "meta"
        },
        {
            "id": "meta/llama-3.2-11b-vision-instruct",
            "object": "model",
            "created": 735790403,
            "owned_by": "meta"
        }
    ]
}
```