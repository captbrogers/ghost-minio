import StorageBase from 'ghost-storage-base'
import { join } from 'path'
import { readFile } from 'fs'
const Minio = require('minio')
const sanitizeFilename = require('sanitize-filename')
const readFileAsync = fp => new Promise((resolve, reject) => readFile(fp, (err, data) => err ? reject(err) : resolve(data)))

class Store extends StorageBase {
  constructor(config = {}) {
    super(config)

    const {
      endpoint,
      port,
      useSSL,
      accessKey,
      secretKey,
      bucket
    } = config

    this.endpoint = process.env.storage__minio__endPoint || endpoint || ''
    this.port = process.env.storage__minio__port+'' || port+'' || ''

    if(process.env.storage__minio__useSSL && ['0', 'false'].includes(process.env.storage__minio__useSSL)){
      this.useSSL = false
    }else if(process.env.storage__minio__useSSL && ['1', 'true'].includes(process.env.storage__minio__useSSL)){
      this.useSSL = true
    }else if (process.env.storage__minio__useSSL){
      throw new Error(`Invalid value ${process.env.storage__minio__useSSL} for useSSL`)
    }else{
      this.useSSL = useSSL || false
    }
        
    this.accessKey = process.env.storage__minio__accessKey || accessKey || ''
    this.secretKey = process.env.storage__minio__secretKey || secretKey || ''
    this.bucket = process.env.storage__minio__bucket || bucket || ''

    let protocol = 'http://'
    if (this.useSSL) {
      protocol = 'https://'
    }

    let urlPort = ''
    if (!isNaN(this.port)) {
      let parsedPort = Number.parseInt(this.port)
      if (parsedPort != 80 && parsedPort != 443) {
        urlPort = ':' + this.port
      }
    }

    this.baseUrl = protocol + this.endpoint + urlPort
  }

  /**
   * Creates a chainable Minio object
   *
   * @return {Minio} An instace of the Minio client
   */
  minioClient() {
    let configs = {
      endPoint: this.endpoint,
      useSSL: this.useSSL,
      accessKey: this.accessKey,
      secretKey: this.secretKey
    }

    if (!isNaN(this.port)) {
      let port = Number.parseInt(this.port)
      if (port != 80 && port != 443) {
        configs.port = port
      }
    }

    return new Minio.Client(configs)
  }

  /**
   * Check for the existence of a given file and will return
   * metadata of that object if it does exist.
   *
   * @param {string} fileName
   * @param {string} targetDir
   * @return {Object}
   */
  exists(fileName, targetDir) {
    const directory = targetDir || this.getTargetDir(this.pathPrefix)
    let _self = this

    return new Promise((resolve, reject) => {
      this.minioClient()
        .statObject(_self.bucket, join(directory, fileName), (err, stat) => {
          if (err) {
            resolve(false)
          }
          resolve(true)
        })
    })
  }

  /**
   * Saves an object to Minio and returns the URL for
   * said object.
   *
   * @param {object} fileObject  A Ghost provided object of metadata
   * @param {string} targetDir
   * @return {string} objectUrl  A "resolved promise" (?) of the object's full URL
   */
  save(fileObject, targetDir) {
    const directory = targetDir || this.getTargetDir(this.pathPrefix)
    let _self = this
   
    return new Promise((resolve, reject) => {
      Promise.all([
        readFileAsync(fileObject.path)
      ]).then(([ fileStream, file ]) => {
        this.getUniqueFileName(fileObject, directory).then((fileName) => {
          _self.minioClient()
            .putObject(_self.bucket, fileName, fileStream, fileObject.size, (err, etag) => {
              if (err) {
                reject(err)
              }

              let objectUrl = _self.baseUrl + '/' + _self.bucket + '/' + encodeURIComponent(fileName)
              resolve(objectUrl)
            })
        }).catch(err => reject(err))
      })
      .catch(err => reject(err))
    })
  }

  /**
   * Stream a file from Minio
   *
   * @param {string} fileName
   * @param {string} targetDir
   * @return {stream} 
   */
  serve(fileName, targetDir) {
    const directory = targetDir || this.getTargetDir(this.pathPrefix)
    let _self = this

    return function customServe(req, res, next) {
      const size = 0
      this.minioClient()
        .getObject(_self.bucket, join(directory, fileName), (err, stream) => {
          if (err) {
            next(err)
          }
          stream.on('data', (chunk) => {
            size += chunk.length
          })
          stream.on('end', () => {
            next(res)
          })
          stream.on('error', (err) => {
            next(err)
          })
        })
        .pipe(res)
    }
  }

  /**
   * Delete an object from Minio.
   *
   * @param {string} fileName
   * @param {string} targetDir
   * @return {boolean} 
   */
  delete(fileName, targetDir) {
    const directory = targetDir || this.getTargetDir(this.pathPrefix)
    let _self = this

    return new Promise((resolve, reject) => {
      this.minioClient()
        .removeObject(_self.bucket, join(directory, fileName), (err) => {
          if (err) {
            reject(err)
          }
          resolve(true)
        })
    })
  }

  /**
   * Stream the file from Minio.
   *
   * @param {string} fileName
   * @param {string} targetDir
   * @return {stream}
   */
  read(fileName, targetDir) {
    const directory = targetDir || this.getTargetDir(this.pathPrefix)
    let _self = this

    return new Promise((resolve, reject) => {
      const size = 0
      this.minioClient()
        .getObject(_self.bucket, join(directory, fileName), (err, stream) => {
          if (err) {
            reject(err)
          }
          stream.on('data', (chunk) => {
            size += chunk.length
          })
          stream.on('end', () => {
            resolve(res)
          })
          stream.on('error', (err) => {
            reject(err)
          })
        })
    })
  }

  getSanitizedFileName(fileName) {
      // below only matches ascii characters, @, and .
      // unicode filenames like город.zip would therefore resolve to ----.zip
      return sanitizeFilename(fileName, { replacement: '_' })
  }
}

export default Store
