"""Create the upload bucket on LocalStack with the CORS rule a browser needs, emptying it first."""
import os
import sys

import boto3

endpoint, bucket, origin = sys.argv[1], sys.argv[2], sys.argv[3]
s3 = boto3.client('s3', region_name='us-east-1', endpoint_url=endpoint)
try:
    s3.create_bucket(Bucket=bucket)
except s3.exceptions.BucketAlreadyOwnedByYou:
    for page in s3.get_paginator('list_objects_v2').paginate(Bucket=bucket):
        for item in page.get('Contents', []):
            s3.delete_object(Bucket=bucket, Key=item['Key'])
s3.put_bucket_cors(Bucket=bucket, CORSConfiguration={'CORSRules': [{
    'AllowedOrigins': [origin], 'AllowedMethods': ['POST', 'GET'], 'AllowedHeaders': ['*'], 'ExposeHeaders': ['ETag'], 'MaxAgeSeconds': 3000,
}]})
print(f'bucket {bucket} ready')
