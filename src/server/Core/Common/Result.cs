namespace Core.Common;

public enum ErrorStatus
{
    NoError = -1,
    Duplicate = 1,
    NotFound = 2,
    InvalidCred = 3,
    UnAuthorized = 5,
    InternalServerError = 6,
    ValidationError = 7,
    TokenExpired = 8,
    Forbidden = 9
}

public class Result<T>
{
    public string Message { get; set; } = string.Empty;
    public bool IsSuccess { get; init; }
    public ErrorStatus ErrorStatus { get; init; }
    public T? Data { get; init; }
    public Dictionary<string, string[]>? Errors { get; set; }

    public static Result<T> Success(T data, string message = "")
        => new() { Data = data, IsSuccess = true, Message = message, ErrorStatus = ErrorStatus.NoError };

    public static Result<T> Failure(string message, ErrorStatus err)
        => new() { IsSuccess = false, Message = message, ErrorStatus = err };

    public static Result<T> ValidationFailure(Dictionary<string, string[]> errors)
        => new()
        {
            IsSuccess = false,
            Message = "Please correct the highlighted fields and try again.",
            Errors = errors,
            ErrorStatus = ErrorStatus.ValidationError
        };
}
