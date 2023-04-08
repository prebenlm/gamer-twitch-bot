const fs = require('fs')
class ChatCommands {
  constructor (client = null, gamerApi = null) {
    this.client = client
    this.gamerApi = gamerApi
    this.data = {}

    if (fs.existsSync('data.json')) {
      this.data = JSON.parse(fs.readFileSync('data.json'))
    }
    this.commands = {
      kamp: this.kamp.bind(this),
      aktivturnering: this.aktivturnering.bind(this)
      // Add more commands here
    }
  }

  // !aktivturnering https://www.gamer.no/turneringer/good-game-bedriftsliga-rocket-league-varen-2023/11077
  //  -> competitionId = 11077
  //
  async aktivturnering (channel, argument, context) {
    if (this.data[channel] === undefined) {
      this.data[channel] = {}
    }

    if (argument === undefined || argument.trim() === '') {
      if (this.data[channel].tournamentId === undefined) {
        this.sendMessage(channel, 'Du må legge til en turneringslink')
      } else {
        // https://www.gamer.no/api/paradise/v2/competition/9539
        const tournament = await this.gamerApi.fetch(`competition/${this.data[channel].tournamentId}`)
        this.sendMessage(channel, `Aktiv turnering er ${tournament.data.name}: ${tournament.data.url}`)
      }
      return
    }

    this.data[channel].tournamentId = argument.split('/').pop()
    const tournament = await this.gamerApi.fetch(`competition/${this.data[channel].tournamentId}`)
    if (tournament.status !== 200) {
      this.sendMessage(channel, `Fant ikke turnering med id "${this.data[channel].tournamentId}" eller noe annet feila`)
      return
    }

    this.sendMessage(channel, `Aktiv turnering er ${tournament.data.name}: ${tournament.data.url}`)
    fs.writeFileSync('data.json', JSON.stringify(this.data))
  }

  async kamp (channel) {
    if (this.data[channel] === undefined || this.data[channel].tournamentId === undefined) {
      this.sendMessage('En moderator må sette en aktiv turnering først! Med !aktivturnering <turneringslink>')
      return
    }

    const endpoint = 'matchup'
    const queryParams = {
      competition_id: this.data[channel].tournamentId,
      from_date: new Date().toISOString().slice(0, 10)
    }

    const matches = await this.gamerApi.fetch(endpoint, queryParams)

    if (matches.status !== 200) {
      this.sendMessage(channel, `Fant ingen kamper for turneringen med id "${this.data[channel].tournamentId}" eller noe annet feila`)
      return
    }

    const match = matches.data.data[0]
    const dateString = new Date(match.start_time).toLocaleString('nb-NO', { timeZone: 'Europe/Oslo', day: 'numeric', month: 'long', hour: 'numeric', minute: 'numeric' })
    this.sendMessage(channel, `Kampen mellom ${match.home_signup.name} og ${match.away_signup.name} starter ${dateString}!`)
    await new Promise((resolve) => setTimeout(resolve, 1000))
    this.sendMessage(channel, `Se kampsiden på Gamer.no her: ${match.url}`)
    // https://www.gamer.no/api/paradise/v2/matchup?competition_id=11077&from_date=2023-04-07'
  }

  async handle (channel, command, argument, context) {
    if (context === undefined) {
      context = {}
    }

    if (this.commands[command]) {
      await this.commands[command](channel, argument, context)
    } else {
      console.log(`* Unknown command ${command}`)
    }
  }

  sendMessage (target, message) {
    if (this.client) {
      this.client.say(target, message)
    } else {
      console.log(`Message to ${target}: ${message}`)
    }
  }
}
module.exports = ChatCommands

// matchup "has_streams=1&competition_id=11077&from_date=2023-04-07"
// looper gjennom alle kamper og sjekker om det er vår stream og finner nærmeste kamp,
// looper gjennom videos og sjekke source er twitch og remote_id er kanalnavnet
