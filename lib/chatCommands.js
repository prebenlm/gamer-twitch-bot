const fs = require('fs')
class ChatCommands {
  constructor (client = null, gamerApi = null) {
    this.client = client
    this.gamerApi = gamerApi
    this.data = {}
    this.sentMessages = new Set()

    if (fs.existsSync('data.json')) {
      this.data = JSON.parse(fs.readFileSync('data.json'))
    }
    this.commands = {
      kamp: this.kamp.bind(this),
      aktivturnering: this.aktivturnering.bind(this),
      aktivlag: this.aktivlag.bind(this),
      aktivdivisjon: this.aktivdivisjon.bind(this)
      // Add more commands here
    }
  }

  // !aktivturnering https://www.gamer.no/turneringer/good-game-bedriftsliga-rocket-league-varen-2023/11077
  //  -> competitionId = 11077
  // https://www.gamer.no/turneringer/good-game-bedriftsliga-rocket-league-varen-2023/11077/kamp/207471
  // https://www.gamer.no/lag/story-house-egmont/168241
  // https://www.gamer.no/klubber/story-house-egmont/168240
  //
  async setActiveThing (channel, argument, context, thing) {
    if (this.data[channel] === undefined) {
      this.data[channel] = {}
    }
    if (this.data[channel][thing] === undefined) {
      this.data[channel][thing] = {}
    }

    let endpoint = false
    let thingId = false
    switch (thing) {
      case 'turnering':
        endpoint = 'competition'
        break
      case 'lag':
        endpoint = 'team'
        break
      case 'divisjon':
        endpoint = 'division'
        break
      default:
        this.sendMessage(channel, '${thing} er ikke en gyldig ting å legge til')
        return
        break
    }

    if (argument === undefined || argument.trim() === '') {
      if (this.data[channel][thing].id === undefined) {
        this.sendMessage(channel, `En moderator må legge til lenke eller ID til ${thing}`)
        return
      }
      thingId = this.data[channel][thing].id
    } else {
      thingId = argument.split('/').pop()

      if (!context.mod) {
        this.sendMessage(channel, `Du må være moderator for å legge til ID til ${thing}`)
        return
      }
      if (argument == 0) {
        this.sendMessage(channel, `Du har nullstilt ${thing}`)
        delete this.data[channel][thing]
        fs.writeFileSync('data.json', JSON.stringify(this.data, null, 2))
        return
      }
    }

    const thingy = await this.gamerApi.fetch(`${endpoint}/${thingId}`)
    if (thingy.status !== 200) {
      this.sendMessage(channel, `Fant ikke ${thing} med id "${thingId}" eller noe annet feila`)
      return
    }

    this.sendMessage(channel, `Aktiv ${thing} er ${thingy.data.name}` + (thingy.data.url ? `: ${thingy.data.url}` : ''))
    this.data[channel][thing].id = thingId
    fs.writeFileSync('data.json', JSON.stringify(this.data, null, 2))
  }

  async aktivlag (channel, argument, context) {
    return this.setActiveThing(channel, argument, context, 'lag')
  }

  async aktivdivisjon (channel, argument, context) {
    if (this.data[channel] === undefined || this.data[channel].turnering === undefined || this.data[channel].turnering.id === undefined) {
      this.sendMessage(channel, 'En moderator må sette en aktiv turnering først! Med !aktivturnering <turneringslink>')
      return
    }

    if (argument !== undefined && argument.trim() !== '') {
      const divisions = await this.gamerApi.fetch(`competition/${this.data[channel].turnering.id}/divisions`)
      const divisionMatches = divisions.data.filter(x => x.name.includes(argument))
      if (divisionMatches.length === 1) {
        argument = divisionMatches[0].id.toString()
      }
    }

    return this.setActiveThing(channel, argument, context, 'divisjon')
  }

  async aktivturnering (channel, argument, context) {
    return this.setActiveThing(channel, argument, context, 'turnering')
  }

  async kamp (channel, argument) {
    if (this.data[channel] === undefined || this.data[channel].tournamentId === undefined) {
      this.sendMessage(channel, 'En moderator må sette en aktiv turnering først! Med !aktivturnering <turneringslink>')
      return
    }

    const endpoint = 'matchup'
    const queryParams = {
      competition_id: this.data[channel].tournamentId,
      from_date: new Date().toISOString().slice(0, 10),
      limit: 100
    }

    const matches = await this.gamerApi.fetch(endpoint, queryParams)

    if (matches.status !== 200) {
      this.sendMessage(channel, `Fant ingen kamper for turneringen med id "${this.data[channel].tournamentId}" eller noe annet feila`)
      return
    }

    let match = matches.data.data[0]
    const ourStreams = matches.data.data.filter(x => x.videos.some(v => v.source === 'twitch' && v.remote_id === channel.replace('#', '')))
    if (ourStreams.length > 0) {
      match = ourStreams[0]
    }
    const teamMatches = matches.data.data.filter(x => x.home_signup.name.includes(argument) || x.away_signup.name.includes(argument))
    if (teamMatches.length > 0) {
      match = teamMatches[0]
    }
    // console.log(argument)

    const dateString = new Date(match.start_time).toLocaleString('nb-NO', { timeZone: 'Europe/Oslo', day: 'numeric', month: 'long', hour: 'numeric', minute: 'numeric' })
    this.sendMessage(channel, `Kampen mellom ${match.home_signup.name} og ${match.away_signup.name} starter ${dateString}! (Runde ${match.round_number} i ${match.division.name})`)
    await new Promise((resolve) => setTimeout(resolve, 1000))
    this.sendMessage(channel, `Se kampsiden på Gamer.no her: ${match.url}`)
    // https://www.gamer.no/api/paradise/v2/matchup?competition_id=11077&from_date=2023-04-07'
  }

  async findNewResults (channel) {
    if (this.data[channel].turnering.id == undefined) {
      console.log(`Channel ${channel} has no active tournament`)
      return
    }

    const endpoint = 'matchup'
    const queryParams = {
      filter: 'finished',
      competition_id: this.data[channel].turnering.id,
      // from_data: '2023-04-11',
      from_date: new Date().toISOString().slice(0, 10),
      limit: 10
    }

    if (this.data[channel].divisjon !== undefined && this.data[channel].divisjon.id !== undefined) {
      console.log('Restricting to division')
      queryParams.division_id = this.data[channel].divisjon.id
    }
    const matches = await this.gamerApi.fetch(endpoint, queryParams)
    if (matches.status === 200) {
      const matchesData = matches.data.data
      for (let i = 0; i < matchesData.length; i++) {
        const match = matchesData[i]
        const winningTeam = match.winning_side === 'home' ? match.home_signup.name : match.away_signup.name
        const message = `${match.division.name}: ${match.home_signup.name} vs ${match.away_signup.name} - Resultat: ${match.home_score} - ${match.away_score} (Gratulerer, ${winningTeam}!)`
        if (!this.sentMessages.has(channel + ':' + message)) {
          this.sendMessage(channel, message, true)

          if (i !== matchesData.length - 1) {
            console.log('Lets wait 10 seconds before sending the next message')
            await new Promise((resolve) => setTimeout(resolve, 10000))
          }
        }
      }
    }
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

  sendMessage (channel, message, dontRepeat = false) {
    if (dontRepeat) {
      if (this.sentMessages.has(channel + ':' + message)) {
        // If the message is in the Set, don't send it again
        return
      }

      // Add the message to the Set and send it
      this.sentMessages.add(channel + ':' + message)
    }

    if (this.client) {
      this.client.say(channel, `${message}`)
    } else {
      console.log(`Message to ${channel}: ${message}`)
    }
  }
}
module.exports = ChatCommands
