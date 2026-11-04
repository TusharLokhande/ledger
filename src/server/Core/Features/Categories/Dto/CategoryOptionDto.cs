using Domain.Enums;

namespace Core.Features.Categories.Dto;

public record CategoryOptionDto(Guid Id, string Name, CategoryType CategoryType, string Icon, string Color);
