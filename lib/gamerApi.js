const axios = require('axios')
class GamerApi {
  constructor () {
    this.baseUrl = process.env.GAMER_API_URL
    this.token = process.env.GAMER_API_TOKEN
  }

  async fetch (endpoint, queryParams = {}) {
    try {
      const url = new URL(endpoint, this.baseUrl)
      for (const [key, value] of Object.entries(queryParams)) {
        url.searchParams.append(key, value)
      }

      const response = await axios.get(url.toString(), {
        headers: {
          Authorization: `Bearer ${this.token}`,
          Accept: 'application/json'
        }
      })

      return response
    } catch (error) {
      console.error('Error fetching data:', error.message)
      console.error('Error fetching data:', error.response.data)
      return error.response
    }
  }
}
module.exports = GamerApi

/*
let yourDate = new Date()
yourDate.toISOString().split('T')[0]
  */
