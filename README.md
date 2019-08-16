# Ghost Minio Storage

Use Minio (an AWS S3 compatible self-hosted storage service) as an image store for Ghost.

_Please note that this hasn't been fully tested, I'd welcome any type of contributions to improve the codebase._

A huge thanks to Colin Meinke for having his [S3 Adapter](https://github.com/colinmeinke/ghost-storage-adapter-s3) on GitHub for me to adapt my code from.

_In the following configuration examples, do not include 'http' or 'https' as part of your endPoint, the script takes care of that._

To configure, set the following config variables in your `config.{environment}.json` file:

```javascript
{
  "storage": {
    "active": "minio",
    "minio": {
      'accessKey': 'minio-access-key',
      'secretKey': 'minio-secret-key',
      'bucket': 'my-bucket',
      'endPoint': 'minio.mydomain.com',
      'port': 9000, (optional)
      'useSSL': true (optional)
    }
  }
}  
```

Or if you are using Docker to manage your Ghost install:

```Dockerfile
ENV storage__active minio
ENV storage__minio__accessKey minio-access-key
ENV storage__minio__secretKey minio-secret-key
ENV storage__minio__bucket my-bucket
ENV storage__minio__endPoint minio.mydomain.com
ENV storage__minio__port 9000 (optional)
ENV storage__minio__useSSL true (optional)
```

Or if you are using `docker-compose`
```yaml
environment:
  storage__active: minio
  storage__minio__accessKey: minio-access-key
  storage__minio__secretKey: minio-secret-key
  storage__minio__bucket: my-bucket
  storage__minio__endPoint: minio.mydomain.com
  storage__minio__port: 9000 (optional)
  storage__minio__useSSL: "true" (optional, but quoted because docker-compose yelled at me)
```
