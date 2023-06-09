import interact from 'interactjs'

// Find documentation for the interactjs library here
// https://interactjs.io/

function makeResizableAndDraggable(cssSelector, chart){

  interact(cssSelector)
    .resizable({
      // resize from all edges and corners
      edges: { left: true, right: true, bottom: true, top: true },
  
      listeners: {
        move (event) {
          var target = event.target
          var x = (parseFloat(target.getAttribute('data-x')) || 0)
          var y = (parseFloat(target.getAttribute('data-y')) || 0)
  
          // update the element's style
          target.style.width = `${event.rect.width / window.innerWidth * 100}vw`
          target.style.height = `${event.rect.height / window.innerWidth * 100}vw`
  
          // translate when resizing from top or left edges
          x += event.deltaRect.left / window.innerWidth * 100
          y += event.deltaRect.top / window.innerWidth * 100
  
          target.style.transform = 'translate(' + x + 'vw,' + y + 'vw)'
  
          target.setAttribute('data-x', x)
          target.setAttribute('data-y', y)
          // target.textContent = Math.round(event.rect.width) + '\u00D7' + Math.round(event.rect.height)

          // Resize the chart when the
          // the container is resized
          if(chart){
            chart.reflow()
          }
        }
      },
      modifiers: [
        // keep the edges inside the parent
        interact.modifiers.restrictEdges({
          outer: 'parent'
        }),
  
        // minimum size
        interact.modifiers.restrictSize({
          min: { width: 20, height: 20 }
        })
      ],
  
      inertia: true
    })
    .draggable({
      listeners: { move: function dragMoveListener (event) {
        var target = event.target,
            // keep the dragged position in the data-x/data-y attributes
            x = (parseFloat(target.getAttribute('data-x')) || 0) + event.dx /window.innerWidth * 100,
            y = (parseFloat(target.getAttribute('data-y')) || 0) + event.dy / window.innerWidth * 100;
    
        // translate the element
        target.style.webkitTransform =
        target.style.transform =
          'translate(' + x + 'vw, ' + y + 'vw)';
    
        // update the posiion attributes
        target.setAttribute('data-x', x);
        target.setAttribute('data-y', y);

          // Resize the chart when the
          // the container is resized
          if(chart){
            chart.reflow()
          }
      } 
    },
      inertia: true,
      modifiers: [
        interact.modifiers.restrictRect({
          restriction: 'parent',
          endOnly: true
        })
      ]
    })
}

function makeDraggable(cssSelector){
  interact(cssSelector).draggable({
    listeners: { move: function dragMoveListener (event) {
      var target = event.target,
          // keep the dragged position in the data-x/data-y attributes
          x = (parseFloat(target.getAttribute('data-x')) || 0) + event.dx,
          y = (parseFloat(target.getAttribute('data-y')) || 0) + event.dy;
  
      // translate the element
      target.style.webkitTransform =
      target.style.transform =
        'translate(' + x + 'px, ' + y + 'px)';
  
      // update the posiion attributes
      target.setAttribute('data-x', x);
      target.setAttribute('data-y', y);
    } 
  },
    inertia: true,
    modifiers: [
      interact.modifiers.restrictRect({
        restriction: 'parent',
        endOnly: true
      })
    ]
  })
}


export  default makeResizableAndDraggable;
export {makeDraggable}
