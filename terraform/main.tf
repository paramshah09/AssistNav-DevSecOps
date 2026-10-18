
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.0"
    }
  }
}

provider "aws" {
  region = "ap-southeast-2"
}

resource "aws_s3_bucket" "assistnav" {
  bucket_prefix = "assistnav-devsecops-"

  tags = {
    Name        = "AssistNav DevSecOps"
    Project     = "AssistNav"
    Environment = "Development"
    ManagedBy   = "Terraform"
  }
}

resource "aws_s3_bucket_website_configuration" "assistnav" {
  bucket = aws_s3_bucket.assistnav.id

  index_document {
    suffix = "index.html"
  }
}

resource "aws_s3_bucket_public_access_block" "assistnav" {
  bucket = aws_s3_bucket.assistnav.id

  block_public_acls       = true
  ignore_public_acls      = false
  block_public_policy     = false
  restrict_public_buckets = false
}

resource "aws_s3_bucket_policy" "assistnav" {
  bucket = aws_s3_bucket.assistnav.id

  depends_on = [
    aws_s3_bucket_public_access_block.assistnav
  ]

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Sid       = "PublicReadWebsiteFiles"
      Effect    = "Allow"
      Principal = "*"
      Action    = "s3:GetObject"
      Resource  = "${aws_s3_bucket.assistnav.arn}/*"
    }]
  })
}

# Separate private bucket for access logs
resource "aws_s3_bucket" "assistnav_logs" {
  bucket_prefix = "assistnav-access-logs-"

  tags = {
    Name        = "AssistNav Access Logs"
    Project     = "AssistNav"
    Environment = "Development"
    ManagedBy   = "Terraform"
  }
}

resource "aws_s3_bucket_public_access_block" "assistnav_logs" {
  bucket = aws_s3_bucket.assistnav_logs.id

  block_public_acls       = true
  ignore_public_acls      = true
  block_public_policy     = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_ownership_controls" "assistnav_logs" {
  bucket = aws_s3_bucket.assistnav_logs.id

  rule {
    object_ownership = "BucketOwnerPreferred"
  }
}

resource "aws_s3_bucket_policy" "assistnav_logs" {
  bucket = aws_s3_bucket.assistnav_logs.id

  depends_on = [
    aws_s3_bucket_public_access_block.assistnav_logs
  ]

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Sid    = "S3ServerAccessLogsDelivery"
      Effect = "Allow"
      Principal = {
        Service = "logging.s3.amazonaws.com"
      }
      Action   = "s3:PutObject"
      Resource = "${aws_s3_bucket.assistnav_logs.arn}/*"
      Condition = {
        ArnLike = {
          "aws:SourceArn" = aws_s3_bucket.assistnav.arn
        }
        StringEquals = {
          "aws:SourceAccount" = data.aws_caller_identity.current.account_id
        }
      }
    }]
  })
}

data "aws_caller_identity" "current" {}

resource "aws_s3_bucket_logging" "assistnav" {
  bucket = aws_s3_bucket.assistnav.id

  target_bucket = aws_s3_bucket.assistnav_logs.id
  target_prefix = "s3-access-logs/"

  depends_on = [
    aws_s3_bucket_policy.assistnav_logs
  ]
}

output "website_endpoint" {
  description = "AssistNav static website endpoint"
  value       = aws_s3_bucket_website_configuration.assistnav.website_endpoint
}

output "logging_bucket_name" {
  description = "Private S3 bucket receiving access logs"
  value       = aws_s3_bucket.assistnav_logs.id
}
