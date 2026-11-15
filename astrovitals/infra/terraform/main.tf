terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source = "hashicorp/aws"
      version = "~> 5.0"
    }

    kubernetes = {
      source = "hashicorp/kubernetes"
      version = "~> 2.0"
    }
  }
}

# ———————————————————————————————————————————————————————————
# Provider configurations
# ———————————————————————————————————————————————————————————

# AWS Provider (for RDS PostgreSQL, S3, etc.)
provider "aws" {
  region = var.aws_region
}

# Kubernetes Provider (for cluster manifests)
provider "kubernetes" {
  host                   = aws_eks_cluster.this.endpoint
  token                    = aws_eks_cluster.this.node_token
  cluster_ca_certificate = base64decode(aws_eks_cluster.this.certificate_authority[0].data)
}

# ———————————————————————————————————————————————————————————
# EKS Cluster (managed Kubernetes)
# ———————————————————————————————————————————————————————————

resource "aws_eks_cluster" "this" {
  name     = "astronotes-cluster"
  role     = aws_iam_role.eks_cluster_role.arn
  version  = "1.31"

  vpc_config {
    subnet_ids = aws_subnet.private.ids
  }

  tags = {
    Name = "astronotes-cluster"
    Project = "AstraVitals"
  }
}

# ———————————————————————————————————————————————————————————
# IAM Roles & Permissions
# ———————————————————————————————————————————————————————————

resource "aws_iam_role" "eks_cluster_role" {
  name = "astronotes-eks-cluster-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17",
    Statement = [
      {
        Effect = "Allow",
        Principal = {
          Service = "eks.amazonaws.com"
        },
        Action = "sts:AssumeRole"
      }
    ]
  })
}

resource "aws_iam_policy" "eks_cluster_policy" {
  name = "astronotes-eks-cluster-policy"

  policy = jsonencode({
    Version = "2012-10-17",
    Statement = [
      {
        Effect = "Allow",
        Action = [
          "ssm:GetParameter",
          "ssm:PutParameter",
          "secretsmanager:GetSecretValue",
          "secretsmanager:DescribeSecret"
        ],
        Resource = "*"
      }
    ]
  })
}

resource "aws_iam_role_attachment" "eks_cluster_attach" {
  role       = aws_iam_role.eks_cluster_role.name
  policy_arn = aws_iam_policy.eks_cluster_policy.arn
}

# ———————————————————————————————————————————————————————————
# RDS PostgreSQL (Aurora or standard RDS)
# ———————————————————————————————————————————————————————————

resource "aws_db_instance" "postgres" {
  identifier = "astronotes-postgres"
  engine       = "postgres"
  version      = "15"
  instance_class = "db.t4g.micro"
  name         = "astronotes"
  username     = "astro_user"
  password     = var.db_password
  allocated_storage = 20
  publicly_accessible = false
  storage_type = "gp2"

  skip_final_snapshot = true
  deletion_protection = false

  vpc_security_group_ids = [aws_security_group.db_sg.id]

  tags = {
    Name = "astronotes-postgres"
    Project = "AstraVitals"
  }
}

# ———————————————————————————————————————————————————————————
# Security Group for DB
# ———————————————————————————————————————————————————————————

resource "aws_security_group" "db_sg" {
  name        = "astronotes-db-sg"
  description = "Security group for AstraVitals PostgreSQL"
  vpc_id      = var.vpc_id

  ingress {
    description = "Allow Aurora/RDS connection from EKS nodes"
    from_port   = 5432
    to_port     = 5432
    protocol    = "tcp"
    security_groups = [aws_eks_cluster_node_group.this.id]
  }

  egress {
    description = "Allow DB to reach internet for updates"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "astronotes-db-sg"
    Project = "AstraVitals"
  }
}

# ———————————————————————————————————————————————————————————
# S3 Bucket for signed sync bundles
# ———————————————————————————————————————————————————————————

resource "aws_s3_bucket" "bundles" {
  bucket = "astronotes-sync-bundles"

  versioning {
    enabled = true
  }

  server_side_encryption_configuration {
    rule {
      apply_server_side_encryption_by_default {
        sse_algorithm = "AES256"
      }
    }
  }

  lifecycle_rule {
    expiration = 30  # days
    enabled    = true
  }

  tags = {
    Name = "astronotes-sync-bundles"
    Project = "AstraVitals"
  }
}

# ———————————————————————————————————————————————————————————
# Outputs
# ———————————————————————————————————————————————————————————

output "eks_cluster_name" {
  value = aws_eks_cluster.this.name
}

output "rds_endpoint" {
  value = aws_db_instance.postgres.endpoint
}

output "s3_bundle_bucket" {
  value = aws_s3_bucket.bundles.id
}