using Core.Common;

namespace Api.Common;

public class ApiResponse<T>
{
    public string Message { get; set; } = string.Empty;
    public T? Data { get; set; }
    public int Status { get; set; }
    public Dictionary<string, string[]>? Errors { get; set; }

    public static ApiResponse<T> FromResult(Result<T> result)
        => new()
        {
            Status = (int)result.ErrorStatus,
            Message = result.Message,
            Data = result.IsSuccess ? result.Data : default,
            Errors = !result.IsSuccess ? result.Errors : null
        };
}
