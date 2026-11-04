using Domain.Entity;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Infrastructure.Persistence.Configurations;

public class ImportBatchesConfiguration : BaseConfiguration<ImportBatches>
{
    public override void Configure(EntityTypeBuilder<ImportBatches> builder)
    {
        base.Configure(builder);
        builder.ToTable("import_batches");
        builder.Property(e => e.FileName).HasMaxLength(255).IsRequired();
        builder.Property(e => e.SourceBlobName).HasMaxLength(300).IsRequired();
        builder.Property(e => e.ErrorBlobName).HasMaxLength(300);
        builder.Property(e => e.Message).HasMaxLength(500);
        builder.HasIndex(e => new { e.UserId, e.CreatedAtUtc });
        builder.HasOne(e => e.User).WithMany().HasForeignKey(e => e.UserId);
    }
}
