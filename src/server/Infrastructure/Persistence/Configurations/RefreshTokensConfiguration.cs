using Domain.Entity;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Infrastructure.Persistence.Configurations;

public class RefreshTokensConfiguration : BaseConfiguration<RefreshTokens>
{
    public override void Configure(EntityTypeBuilder<RefreshTokens> builder)
    {
        base.Configure(builder);
        builder.ToTable("refresh_tokens");
        builder.Property(e => e.TokenHash).HasMaxLength(64).IsRequired();
        builder.HasIndex(e => e.TokenHash).IsUnique();
        builder.HasOne(e => e.User).WithMany().HasForeignKey(e => e.UserId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
