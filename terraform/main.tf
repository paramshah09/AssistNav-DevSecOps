
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

  block_public_acls       = false
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

output "website_endpoint" {
  description = "AssistNav static website endpoint"
  value       = aws_s3_bucket_website_configuration.assistnav.website_endpoint
}
