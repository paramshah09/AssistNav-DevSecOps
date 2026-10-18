
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
