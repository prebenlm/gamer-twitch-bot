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
      aktivdivisjon: this.aktivdivisjon.bind(this),
      tabell: this.tabell.bind(this),
      score: this.score.bind(this),
      resultat: this.score.bind(this),
      aktivkamp: this.aktivkamp.bind(this),
      forsinkelse: this.forsinkelse.bind(this),
      gamerbot: this.gamerbot.bind(this),
      esportbot: this.gamerbot.bind(this),
      maps: this.score.bind(this)
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
      case 'kamp':
        endpoint = 'matchup'
        break
      default:
        this.sendMessage(channel, `${thing} er ikke en gyldig ting å legge til`)
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
    let thingyname = thingy.data.name;
    if (thing === 'kamp') {
      thingyname = thingy.data.home_signup.name + ' vs ' + thingy.data.away_signup.name;
    }

    this.sendMessage(channel, `Aktiv ${thing} er ${thingyname}` + (thingy.data.url ? `: ${thingy.data.url}` : ''))
    this.data[channel][thing].id = thingId
    fs.writeFileSync('data.json', JSON.stringify(this.data, null, 2))
  }

  async gamerbot (channel, argument, context) {
    if (!context.mod) {
      return
    }
    if (this.data[channel] === undefined) {
      this.data[channel] = {}
    }
    if (argument === 'av' || argument === 'off' || argument === 'false') {
      this.data[channel].offline = true
      fs.writeFileSync('data.json', JSON.stringify(this.data, null, 2))
      this.sendMessage(channel, 'Esportbot er nå slått av', false, false)
      return
    }
    if (argument === 'på' || argument === 'on' || argument === 'true') {
      this.data[channel].offline = false
      fs.writeFileSync('data.json', JSON.stringify(this.data, null, 2))
      this.sendMessage(channel, 'Esportbot er nå slått på', false, false)
      return
    }

    if (this.data[channel].offline) {
      this.data[channel].offline = false
      this.sendMessage(channel, 'Esportbot er nå slått på', false, false)
    } else {
      this.data[channel].offline = true
      this.sendMessage(channel, 'Esportbot er nå slått av', false, false)
    }
    fs.writeFileSync('data.json', JSON.stringify(this.data, null, 2))
  }

  async forsinkelse(channel, argument, context) {
    if (this.data[channel] === undefined) {
      this.data[channel] = {}
    }
    if (context.mod === true && argument !== undefined && !isNaN(argument)) {
      this.data[channel].forsinkelse = argument
      fs.writeFileSync('data.json', JSON.stringify(this.data, null, 2))
    }
    if (this.data[channel].forsinkelse === undefined) {
      this.data[channel].forsinkelse = 0
      fs.writeFileSync('data.json', JSON.stringify(this.data, null, 2))
    }
    this.sendMessage(channel, `Forsinkelse er satt til ${this.data[channel].forsinkelse} sekunder.`)
  }

  async score (channel, argument, context) {
    if (this.data[channel] === undefined) {
      this.data[channel] = {}
    }
    const match = await this.gamerApi.fetch(`matchup/${this.data[channel].kamp.id}`)
    if (match.status !== 200) {
      this.sendMessage(channel, `Fant ikke kamp med id "${thingId}" eller noe annet feila`)
      return
    }

    const now = new Date()
    const matchData = match.data
    const homeTeam = matchData.home_signup.display_name
    const awayTeam = matchData.away_signup.display_name
    let homeScore = 0;
    let awayScore = 0;
    const maps = matchData.matchupmaps
    const boText = `BO${matchData.best_of}`
    //console.log(matchData)
    console.log(`matchData ${matchData.home_score}-${matchData.away_score}`)

    let scoreMessage = `${boText}: ${homeTeam} vs ${awayTeam}`
    //console.log('Found maps ' + maps.length)
    if (maps !== undefined) {
      maps.forEach((map, index) => {
        const finishedAt = new Date(map.finished_at)
        //console.log(map.finished_at)
        //console.log(map)
        const timeSinceFinished = now.getTime() - finishedAt.getTime()

        let delay = 1000 * 60 * 2
        if (this.data[channel].forsinkelse) {
          delay = this.data[channel].forsinkelse * 1000;
        }

        if (index == 0) {
          scoreMessage += ' #CALCULATED_SCORE# | '
        } else {
          scoreMessage += ' / '
        }
        //console.log(`${map.resource.name}:` + finishedAt.getTime())
        //console.log(`delay ${delay} / timeSinceFinished ` + timeSinceFinished)


        if (finishedAt.getTime() > 0 && timeSinceFinished > delay) {

          const mapName = map.resource.name

          scoreMessage += `Map ${mapName}: ${map.home_score}-${map.away_score}`
          if (map.home_score > map.away_score) {
            homeScore++;
          } else {
            awayScore++;
          }
          
          console.log(`TimeSinceFinished ${mapName}: ${timeSinceFinished}/${delay}`)
        } else {
          if (map.home_score && map.away_score) {
            console.log(`LIVE: Map ${map.resource.name}: ${map.home_score}-${map.away_score}`)
          }
          scoreMessage += `Map ${map.resource.name}: TBD`
          if (finishedAt.getTime() > 0)  {
            console.log(`We have a result, but it's too soon to show it: ${timeSinceFinished}/${delay}`)
            console.log(`Map ${map.resource.name}: ${map.home_score}-${map.away_score}`)
          }
        }
      })

      if (now.getTime() < new Date(matchData.start_time).getTime()) {
        scoreMessage += '. Kampen begynner ' + this.relativeDateString(matchData.start_time)
      }
      if (homeScore || awayScore) {
        scoreMessage = scoreMessage.replace('#CALCULATED_SCORE#', `(${homeScore}-${awayScore})`);
      } else {
        scoreMessage = scoreMessage.replace('#CALCULATED_SCORE#', '');
      }

      this.sendMessage(channel, scoreMessage)
    }
  }

  async aktivlag (channel, argument, context) {
    return this.setActiveThing(channel, argument, context, 'lag')
  }

  async aktivkamp (channel, argument, context) {
    return this.setActiveThing(channel, argument, context, 'kamp')
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

  async tabell (channel) {
    if (this.data[channel] === undefined || this.data[channel].turnering === undefined || this.data[channel].turnering.id === undefined) {
      this.sendMessage(channel, 'En moderator må sette en aktiv turnering først! Med !aktivturnering <turneringslink>')
      return
    }

    const tourney = await this.gamerApi.fetch(`competition/${this.data[channel].turnering.id}`)
    if (tourney.status !== 200) {
      this.sendMessage(channel, `Fant ikke turnering med id "${thingId}" eller noe annet feila`)
      return
    }

    this.sendMessage(channel, `Du finner tabellen til ${tourney.data.name} her: ${tourney.data.url}/tabeller`)
  }

  async kamp (channel, argument) {
    if (this.data[channel] === undefined || this.data[channel].turnering.id === undefined) {
      this.sendMessage(channel, 'En moderator må sette en aktiv turnering først! Med !aktivturnering <turneringslink>')
      return
    }
    console.log('Søker turnering: ' + this.data[channel].turnering.id)

    const endpoint = 'matchup'
    const queryParams = {
      competition_id: this.data[channel].turnering.id,
      from_date: new Date().toISOString().slice(0, 10),
      limit: 100
    }

    const matches = await this.gamerApi.fetch(endpoint, queryParams)

    if (matches.status !== 200) {
      this.sendMessage(channel, `Fant ingen kamper for turneringen med id "${this.data[channel].turnering.id}" eller noe annet feila`)
      return
    }

    let match = matches.data.data[0]
    const ourStreams = matches.data.data.filter(x => x.videos.some(v => v.source === 'twitch' && v.remote_id === channel.replace('#', '')))
    if (ourStreams.length > 0) {
      match = ourStreams[0]
    }
    if (argument) {
      console.log(argument)
      const teamMatches = matches.data.data.filter(x => x.home_signup.name.includes(argument) || x.away_signup.name.includes(argument))
      if (teamMatches.length > 0) {
        match = teamMatches[0]
      }
    }


    const dateString = new Date(match.start_time).toLocaleString('nb-NO', { timeZone: 'Europe/Oslo', day: 'numeric', month: 'long', hour: 'numeric', minute: 'numeric' })
    this.sendMessage(channel, `Kampen mellom ${match.home_signup.name} og ${match.away_signup.name} starter ${dateString}! (${match.round_identifier_text} i ${match.division?.name ?? match.competition.name})`)
    await new Promise((resolve) => setTimeout(resolve, 1000))
    this.sendMessage(channel, `Se kampsiden på Gamer.no her: ${match.url}`)
  }

  async findNewResults (channel) {
    //console.log(this.data[channel])
    //console.log(this.data[channel].turnering)
    if (this.data[channel].turnering.id == undefined) {
      console.log(`Channel ${channel} has no active tournament`)
      return
    }
    let minSecondsSinceFinished = 0
    if (this.data[channel].forsinkelse !== undefined) {
      minSecondsSinceFinished = this.data[channel].forsinkelse
    }

    const endpoint = 'matchup'
    const queryParams = {
      filter: 'finished',
      competition_id: this.data[channel].turnering.id,
      //from_data: '2023-04-01',
      from_date: new Date().toISOString().slice(0, 10),
      limit: 10
    }

    if (this.data[channel].divisjon !== undefined && this.data[channel].divisjon.id !== undefined) {
      //console.log('Restricting to division')
      queryParams.division_id = this.data[channel].divisjon.id
    }
    const matches = await this.gamerApi.fetch(endpoint, queryParams)
    if (matches.status === 200) {
      const matchesData = matches.data.data
      for (let i = 0; i < matchesData.length; i++) {
        const match = matchesData[i]
        const winningTeam = match.winning_side === 'home' ? match.home_signup.name : match.away_signup.name
        const message = `${match.division.name}: ${match.home_signup.name} vs ${match.away_signup.name} - Resultat: ${match.home_score} - ${match.away_score} (Gratulerer, ${winningTeam}!)`
        const finishedAt = new Date(match.finished_at);
        const currentTime = new Date();
        const secondsSinceFinished = (currentTime - finishedAt) / 1000;
        
        
        if (!this.sentMessages.has(channel + ':' + message)) {
          console.log(`There is ${secondsSinceFinished} seconds since match finished and we require minimum ${minSecondsSinceFinished}`)
          if (secondsSinceFinished >= minSecondsSinceFinished) {
            //this.sendMessage(channel, message, true)
            console.log("We would have sent: " + message)

            if (i !== matchesData.length - 1) {
              console.log('Lets wait 10 seconds before sending the next message')
              await new Promise((resolve) => setTimeout(resolve, 10000))
            }
          }
        }
      }
    }
  }

  async handle (channel, command, argument, context) {
    if (context === undefined) {
      context = {}
    }
    if (this.data[channel] === undefined) {
      this.data[channel] = {}
    }

    if (this.data[channel].offline && command !== 'gamerbot' && command !== 'esportbot') {
      console.log(`Bot has been turned off for channel ${channel}`)
      return
    }
    if (this.commands[command]) {
      await this.commands[command](channel, argument, context)
    } else {
      console.log(`* Unknown command ${command}`)
    }
  }

  relativeDateString(dateString) {
    const now = new Date();
    const givenDate = new Date(dateString);
  
    const isPast = givenDate < now;
    const sameDay = now.getDate() === givenDate.getDate() &&
                    now.getMonth() === givenDate.getMonth() &&
                    now.getFullYear() === givenDate.getFullYear();
  
    const norwegianTimeFormatter = new Intl.DateTimeFormat('no-NO', {
      hour: '2-digit',
      minute: '2-digit',
    });
  
    const norwegianDateFormatter = new Intl.DateTimeFormat('no-NO', {
      day: 'numeric',
      month: 'numeric',
    });
  
    const formattedTime = norwegianTimeFormatter.format(givenDate);
  
    if (sameDay && isPast) {
      return formattedTime;
    } else if (sameDay && givenDate.getHours() >= 18) {
      return `i kveld, ${formattedTime}`;
    } else if (sameDay) {
      return `i dag, ${formattedTime}`;
    } else if (now.getDate() + 1 === givenDate.getDate() &&
               now.getMonth() === givenDate.getMonth() &&
               now.getFullYear() === givenDate.getFullYear()) {
      return `i morgen, ${formattedTime}`;
    } else {
      const formattedDate = norwegianDateFormatter.format(givenDate);
      return `${formattedDate}, ${formattedTime}`;
    }
  };
  
  isPastDate(dateString) {
    const now = new Date();
    const givenDate = new Date(dateString);
    return givenDate < now;
  };
  

  sendMessage (channel, message, dontRepeat = false, offlineCheck = true) {
    if (dontRepeat) {
      if (this.sentMessages.has(channel + ':' + message)) {
        // If the message is in the Set, don't send it again
        return
      }

      // Add the message to the Set and send it
      this.sentMessages.add(channel + ':' + message)
    }
    if (this.data[channel] === undefined) {
      this.data[channel] = {}
    }
    if (offlineCheck && this.data[channel].offline) {
      console.log(`Bot is OFFLINE. Not sending message: [${channel}] ${message}`)
      return
    }

    if (this.client) {
      this.client.say(channel, `${message}`)
    } else {
      console.log(`Message to ${channel}: ${message}`)
    }
  }
}
module.exports = ChatCommands
