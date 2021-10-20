import { Template } from 'meteor/templating'
import './main.html'
import '/lib/collections'
import '/lib/tools'

require('jquery')
require('jquery-ui')
require('jquery-ui-sortable-npm')
require('popper.js')
require('bootstrap')

Template.body.onCreated(()=>{
  Session.set('editSchedule', null)
  Session.set('resizeNodeY', null)
  setTimeout(()=>showWeek(moment().startOf('week')), 100)
})
let money = '0'
Template.body.helpers({
  grid(){
    let hours = []
    let hour = moment(moment(this).format('MM-DD-YYYY') + ' 12:00:00am', 'MM-DD-YYYY hh:mm:ssa')
    for(var j=0;j<24;j++){
      hours.push(hour.clone().add(j, 'hour').valueOf())
    }
    return hours
  },
  money(){
    return money
  }
})

Template.body.events({
  'click .fa-chevron-left'(){
    money
  },
  'click .fa-chevron-left'(){

  },
  'click [dropdown]'(e){
    const target = $(e.target).closest('[dropdown]')
    const dropTarget = $(target.attr('dropdown'))
    if(dropTarget[0]){
      e.stopPropagation()
      $(`[dropdown="true"]:not(${target.attr('dropdown')})`).attr({dropdown: 'false'})
      dropTarget.attr({dropdown:dropTarget.attr('dropdown') == 'true' ? 'false' : 'true'})
      dropTarget.parents('[dropdown="false"]').attr({dropdown:'true'})
    }
  },
  'click *'(e){
    if(!($(e.target).is('[dropdown]') || $(e.target).is('[dropdown] *'))) {
      $('[dropdown="true"]').attr({dropdown:'false'})
    }
  },
  'change #WeekPicker'(e){
    showWeek(moment(e.target.value, 'YYYY-MM-DD').startOf('week'))
  },
  'click #PrevWeek'(){
    showWeek(moment(Session.get('week')[0]).subtract(1, 'week'))
    $('#WeekPicker').val('')
  },
  'click #NextWeek'(){
    showWeek(moment(Session.get('week')[0]).add(1, 'week'))
    $('#WeekPicker').val('')
  },
  'change input[id*="-Activate"]'(e){
    Schedules.update(e.target.id.split('-')[0], {$set:{active:e.target.checked}}, err=>{
      err ? console.log(err) : drawSchedules()
    })
  },
  'click i[id*="-Edit"]'(e){
    console.log('Edit', e.target.id.split('-')[0])
    Session.set('editSchedule', Schedules.findOne(e.target.id.split('-')[0]))
    drawSchedules()
  },
  'click .btn[id*="-Save"]'(e){
    console.log('Save', e.target.id.split('-')[0])
    console.log('Update node with:', )
    let editSchedule = Session.get('editSchedule')
    if(editSchedule.name != $('#ScheduleName').val() || editSchedule.color != $('#ScheduleColor').val()){
      Schedules.update(editSchedule._id, {$set:{name:$('#ScheduleName').val(), color:$('#ScheduleColor').val()}})
    }
    Session.set('editSchedule', null)
    drawSchedules()
  },
  'mouseenter [id*=-NodeOverlay]'(e){
    if(Session.get('editSchedule') && !$('#OverlayIndicator').length){
      $($(e.target).closest('[id*=-NodeOverlay]')).append('<i id="OverlayIndicator" class="far fa-clinic-medical fa-rotate-90 position-absolute"></i>')
    }
  },
  'mouseleave [id*=-NodeOverlay]'(e){
    $('#OverlayIndicator').remove()
  },
  'mousemove [id*=-NodeOverlay]'(e){
    let overlay = $(e.target).closest('[id*=-NodeOverlay]')
    let day = moment(parseInt(overlay.attr('id').replace('-NodeOverlay', '')))
    let node = $(e.target).closest('.node')
    let editSchedule = Session.get('editSchedule')
    let resizeNode = $('[resizing]')
    let currentQuarter = (Math.floor(((e.pageY-overlay.offset().top+1)/20)*4)/4)
    let selectedTime = ('0' + Math.floor(currentQuarter) % 24).slice(-2) + ':' + ((currentQuarter % 1)*60 + '0').slice(0, 2)
    let quarter = moment(day.format('MM-DD-YYYY') + selectedTime, 'MM-DD-YYYY HH:mm')
    if(editSchedule && !(node && quarter.isAfter(node.prop('start')) && quarter.isBefore(node.prop('end')))){
      $('#OverlayIndicator').css('top', `${(currentQuarter*20)-9}px`)
      $('#OverlayIndicator').prop('pos', quarter.valueOf())
      if($('#ProspectiveNode').length){
        $('#ProspectiveNode').css('height', (currentQuarter*20)-parseInt($('#ProspectiveNode').css('top').slice(0, -2)))
      }
    }
    if(resizeNode.length){
      let handle = resizeNode.attr('resizing')
      let top = parseInt(resizeNode.css('top').slice(0, -2))
      let height = parseInt(resizeNode.css('height').slice(0, -2))
      let targetTop = handle == 'start' ? currentQuarter*20 : handle == 'node' ? Math.round(((currentQuarter*20) - resizeNode.prop('resizingOffset'))/5)*5 : top
      let targetHeight = handle == 'end' ? (currentQuarter*20) - top : handle == 'start' ? height + top - (currentQuarter*20) : height
      resizeNode.css({
        top: targetTop,
        height: targetHeight
      })
      resizeNode[((targetTop%20) ? 'add' : 'remove') + 'Class']('border-top')
      let startPercent = (((targetTop/20)*4)/4)
      let endPercent = ((((targetTop + targetHeight)/20)*4)/4)
      resizeNode.prop({
        start: moment(day.format('MM-DD-YYYY') + ('0' + Math.floor(startPercent) % 24).slice(-2) + ':' + ((startPercent % 1)*60 + '0').slice(0, 2), 'MM-DD-YYYY HH:mm').valueOf(),
        end: moment(day.format('MM-DD-YYYY') + ('0' + Math.floor(endPercent) % 24).slice(-2) + ':' + ((endPercent % 1)*60 + '0').slice(0, 2), 'MM-DD-YYYY HH:mm').valueOf()
      })
      // find node by name, and update it when the event ends. make sure names are unique
    }
  },
  'click [id*=-NodeOverlay]'(e){
    let overlay = $(e.target).closest('[id*=-NodeOverlay]')
    let day = moment(parseInt(overlay.attr('id').replace('-NodeOverlay', ''))).format('d')
    let editSchedule = Session.get('editSchedule')
    let addNode = Session.get('addNode')
    if(editSchedule && !$('[resizing]').length){
      if(addNode){
        let name = prompt('Session name:')
        if(name){
          Schedules.update(editSchedule._id, {$push:{[`nodes.${day}`]:{
            start: Session.get('addNode').start,
            end: $('#OverlayIndicator').prop('pos'),
            name: name
          }}})
        }
        Session.set('addNode', null)
        Session.set('editSchedule', Schedules.findOne(editSchedule._id))
        $('#ProspectiveNode').remove()
        overlay.prop('handles', true)
        drawSchedules()
      }else{
        if(!$('[resizing]').length){
          Session.set('addNode', {start:$('#OverlayIndicator').prop('pos')})
          overlay.append(`<div id="ProspectiveNode" class="node position-absolute w-100 bg-primary" style="height:5px; top:${parseInt($('#OverlayIndicator').css('top').slice(0, -2))+9}px;"></div>`)
          overlay.prop('handles', false)
        }
      }
    }
  },
  'mousedown .node, mousedown .moveStart, mousedown .moveEnd'(e){
    if(Session.get('editSchedule') && !Session.get('addNode')){
      Session.set('resizing', true)
      if(Session.get('resizeNodeY') === null){
        Session.set('resizeNodeY', e.clientY)
      }
      let node = $(e.target).closest('.node')
      node.attr('resizing', $(e.target).hasClass('node') ? 'node' : $(e.target).hasClass('moveStart') ? 'start' : 'end')
      node.prop('resizingOffset', e.offsetY)
      node.prop('resizingTop', parseInt(node.css('top').slice(0, -2)))
      node.prop('resizingHeight', parseInt(node.css('height').slice(0, -2)))
    }
  },
  'mouseup .node, mouseup .moveStart, mouseup .moveEnd'(e){
    if(Session.get('editSchedule') && !Session.get('addNode')){
      if(Session.get('resizeNodeY') == e.clientY){
        console.log('clicked, didn\'t drag, start listening')
      }else{
        if($('[resizing]').length){
          console.log('click or drag end')
          let day = moment(parseInt($(e.target).closest('[id*=-NodeOverlay]').attr('id').replace('-NodeOverlay', ''))).format('d')
          let nodes = Session.get('editSchedule').nodes[day]
          let i = 0
          while(nodes[i].name != $('[resizing]').prop('name') && i < nodes.length){
            i++
          }
          if(i == nodes.length){
            console.log('Couldn\'t find node')
          }else{
            Schedules.update(Session.get('editSchedule')._id, {$set:{[`nodes.${day}.${i}`]:{
              start: $('[resizing]').prop('start'),
              end: $('[resizing]').prop('end'),
              name: $('[resizing]').prop('name')
            }}})
          }
          $('[resizing]').removeAttr('resizingOffset')
          $('[resizing]').removeAttr('resizing')
          Session.set('resizeNodeY', null)
        }
      }
    }
  },
  'click .node, click .moveStart, click .moveEnd'(e){
    e.stopPropagation()
  },
  'click #AddSchedule'(e){
    let name = prompt('Internal Name:')
    if(name){
      Schedules.insert({name:name, nodes:{}, color:'#ababab', active:false})
    }
  },
  'change #ScheduleColor'(e){
    $('.node').css('background-color', e.target.value)
  },
  'click #ScheduleWeek'(e){
    Meteor.call('ScheduleWeek', Session.get('week'), err=>{
      if(err){

      }else{
        $(e.target).css('display', 'none')
        $('#ScheduledWeek').css('display', 'block')
        setTimeout(()=>{
          $(e.target).css('display', 'block')
          $('#ScheduledWeek').css('display', 'none')
        }, 1000)
      }
    })
  }
})

$(document).on('keydown', e=>{
  if(e.key == 'Escape'){
    Session.set('addNode', null)
    $('[resizing]').removeAttr('resizing')
    $('[resizing]').removeAttr('resizingOffset')
    $('#ProspectiveNode').remove()
  }
})

function showWeek(startDate){
  let week = [];
  for(var i=0; i<7; i++){
    week.push(startDate.clone().add(i, 'day').valueOf())
  }
  Session.set('week', week)

  waitForCards()
  function waitForCards(){
    console.log('Waiting for cards')
    if(Schedules.findOne() && $(`#${week[6]}-NodeOverlay`).length){
      drawSchedules()
    }else{
      setTimeout(waitForCards, 10)
    }
  }
}

function drawSchedules(){
  $('[id*=-NodeOverlay]').children().remove()
  let schedules = Session.get('editSchedule') ? [Session.get('editSchedule')] : Schedules.find({active:true}).fetch()
  console.log(schedules)
  schedules.forEach(schedule=>{
    Object.entries(schedule.nodes).forEach(([d, nodes])=>{
      let day = moment(Session.get('week')[d])
      nodes.forEach(node=>{
        let dayString = day.format('MM-DD-YYYY ')
        let height = moment(dayString + moment(node.end).format('hh:mma'), 'MM-DD-YYYY hh:mma').diff(moment(dayString + moment(node.start).format('hh:mma'), 'MM-DD-YYYY hh:mma'), 'minutes')/3
        let top = moment(dayString + moment(node.start).format('hh:mma'), 'MM-DD-YYYY hh:mma').diff(moment(dayString + '12:00am', 'MM-DD-YYYY hh:mma'), 'minutes')/3
        $(`#${day.valueOf()}-NodeOverlay`).append(`<div class="node d-flex flex-column justify-content-between border-bottom ${moment(node.start).format('mm') == '00' ? 'border-top-0' : 'border-top'} border-dark currentDraw" style="height:${height}px; ${Session.get('editSchedule') ? 'width:100%;' : 'width:20px;'} top:${top}px; background-color:${schedule.color};">${Session.get('editSchedule') ? '<div class="moveStart"></div><div class="moveEnd"></div>' : ''}</div>`)
        while($('[id*=-NodeOverlay]>div:not(.currentDraw)').toArray().some(a=>overlap($(a), $('.currentDraw')))){
          console.log('Bumping')
          $('.currentDraw').css('left', '+=20px')
        }
        $('.currentDraw').prop({
          start: node.start,
          end: node.end,
          name: node.name
        })
        $('.currentDraw').removeClass('currentDraw')
      })
    })
  })
}

function overlap(d1, d2){
  var x1 = d1.offset().left
  var y1 = d1.offset().top
  var h1 = d1.outerHeight(true)
  var w1 = d1.outerWidth(true)
  var b1 = y1 + h1
  var r1 = x1 + w1
  var x2 = d2.offset().left
  var y2 = d2.offset().top
  var h2 = d2.outerHeight(true)
  var w2 = d2.outerWidth(true)
  var b2 = y2 + h2
  var r2 = x2 + w2
  return !(b1 <= y2 || y1 >= b2 || r1 <= x2 || x1 >= r2)
}