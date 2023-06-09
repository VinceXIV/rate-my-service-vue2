<template>
  <div>
    <NavBar/>
    <div class="main-area">
      <CanvasComponent
        :canvasArray="data"
        :changeMode="changeMode"
        :mode="mode"
        :addChartToSlide="addChartToSlide"
        :saveData="saveData"
        :updateText="updateText"
        :activeObjectInfo="activeObjectInfo"
        :updateActiveObjectInfo="updateActiveObjectInfo"
        :exportToPowerPoint="exportToPowerPoint"
        :layoutList="newCopy(layoutList)"
        :activeLayout="activeLayout"
        :updateTextStyle="updateTextStyle"
        :removeActiveObjectContent="removeActiveObjectContent"
        :removeSlide="removeSlide"
        :deleteSlideObject="deleteSlideObject"
        :addNewObjectToSlide="addNewObjectToSlide"
        @update-active-layout="(layout)=>updateActiveLayout(layout)"
        @add-slide="addSlide()"/>
    </div>
  </div>
</template>

<script>
import NavBar from './components/NavBar/NavBar.vue'
import CanvasComponent from './components/Canvas/CanvasComponent.vue';
import canvasObjects from './utilities/data/sampleData';
import layoutList from './utilities/data/layoutlist';
import getLayouts from './utilities/functions/getlayouts';
import pptxgen from "pptxgenjs";
import {getContents, getPositions, getPptxCompatibleStyle} from './utilities/functions/createppt';
// import sampleData from './utilities/data/sampleData';

export default {
  name: 'App',


  data(){
    return {
      data: [this.newCopy(layoutList[0])],
      // data: sampleData,
      mode: 'edit', // mode can be edit or preview. Will determine how slides will be displayed
      layoutList: layoutList,
      activeLayout: layoutList[layoutList.length-1],
      activeObjectInfo: {
        canvasId: null,
        objectId: null,
        type: "",
        content: {}
      },
      idCount: canvasObjects.length, // will be used to ensure ids of new slides dont clash,
      forceRerender: 0
    }
  },


  components: {
    NavBar,
    CanvasComponent
  },

  mounted: function() {
    // Make the first slide active by default
    this.activeObjectInfo = {...this.activeObjectInfo, canvasId: this.data?.[0]?.id}
  },


  methods: {
    changeMode: function(newMode){
      this.mode = newMode
    },

    removeSlide: function(){
      this.unrenderChart(this.activeObjectInfo.canvasId, this.activeObjectInfo.objectId)
      const newData = this.data.filter(slide => slide.id !== this.activeObjectInfo.canvasId)
      this.data = newData
    },

    addNewObjectToSlide: function(slideId, newObject){

      const activeSlide = this.data.find(slide => slide.id === slideId)

      if(activeSlide){
        newObject = {...newObject, id: this.getBiggestId(activeSlide) + 1}
        const modifiedObjectArray = activeSlide.objects
        modifiedObjectArray.push(newObject)
  
        const newSlide = {
          ...activeSlide,
          objects: modifiedObjectArray
        }
    
        this.data = this.data.map(slide => {
          if(slide.id !== activeSlide.id){
            return slide
          }else {
            return newSlide
          }
        })
      }
    },

    getBiggestId: function(activeSlide){
      //I am assuming that the ids are integers in this function

      return activeSlide.objects.reduce((prev, curr) => {
          if(curr.id >= prev){
            return curr.id
          }else {
            return prev
          }
        }, 0)
      
    },

    updateTextStyle: function(newStyle){

      const targetCanvasId = this.activeObjectInfo.canvasId
      const targetObjectId = this.activeObjectInfo.objectId

      let newData = this.data.map(canvas => {
        if(canvas.id !== targetCanvasId){
          return canvas
        }else{
          const updatedCanvas = {
              ...this.newCopy(canvas),
              objects: canvas.objects.map(object => {
                if(object.id !== targetObjectId){
                  return object
                }else {
                  // We are updating the style of the content.
                  // The style field is inside the slide object, which is 
                  // inside the slide. Check utilities/sampleData.js to find out more
                  const newContent = {
                      ...this.newCopy(object).content,
                      style: {
                        ...this.newCopy(object).content?.style,
                        ...newStyle
                      }
                    }

                  // Remember to update active object info with this new information
                  this.updateActiveObjectInfo({content: newContent})

                  return {
                    ...this.newCopy(object),
                    content: newContent
                  }
                }
            })
          }

          return updatedCanvas
        }
      })

      this.data = newData
    },

    saveData: function(){
      // "saveReadyData" represents our slides with everything updated
      // such that initializing the program with the data will get us
      // our work as it looked at that point 
      this.data = this.getSaveReadyData()

      // WRITE CODE FOR SENDING THE DATA TO THE BACKEND HERE
      // i.e fetch(<apihost>/<endpoint>, {method: <m>, headers: <h>, body: JSON.stringify(this.data)})
    },

    exportToPowerPoint: async function(fileName='file'){
      // Find more information on exporting the presentation to powerpoint 
      // here https://gitbrent.github.io/PptxGenJS/docs/usage-saving/

      // 1. Create a Presentation
      let pres = new pptxgen();
 
      for(let i = 0; i < this.data.length; i++){
        // 2. Add a Slide to the presentation
        let slide = pres.addSlide();

        // this.data == canvas/slide. The positions and contents
        // here are the position and contents in that canvas/slide
        let positions = getPositions(this.data[i])
        let contents = getContents(this.data[i])

        for(let j = 0; j < this.data[i].objects.length; j++){
          const content = contents[`object-${this.data[i].objects[j].id}`]
          const position = positions[`object-${this.data[i].objects[j].id}`]
          
          if(content.type === "text"){
            // Text styles supported by pptxgen are not exactly similar to
            // CSS. For instance, font-size should be a digit ranging between
            // 1 - 256 in pptxgen, but we could use "rem", "em", etc in css
            // find more here; https://gitbrent.github.io/PptxGenJS/docs/api-text/
            const textStyles = getPptxCompatibleStyle(content.style)  
            
            slide.addText(content.value, {...position, ...textStyles})

          } else if(content.type === 'chart' && content.value){
            // Export the highcart objects content to b64 image first
            const response = await fetch("https://export.highcharts.com/", {
              "headers": {
                "content-type": "application/json",
              },
              "body": JSON.stringify({
                          "infile": content.value,
                          "b64": true
                        }),
              "method": "POST",
              "mode": "cors"
            })

            let highchartB64 = await response.text()
            
            slide.addImage({
              data: "data:image/png;base64, " + highchartB64,
              ...position
            })

          }
        }
      }

      pres.writeFile({fileName: fileName})
    },

    updateText(canvasId, objectId, newText){
      const targetCanvas = this.data.find(canvas => canvasId === canvas.id)
      const targetObject = targetCanvas.objects.find(object => objectId === object.id)

      // Update active object info
      this.updateActiveObjectInfo({value: newText}, 'content')
      
      // update the text content
      if(targetObject?.content){
        targetObject.content.value = newText
      }else {
        const oldContent = targetObject.content
        targetObject.content = {...oldContent, value: newText}
      }
    },

    removeActiveObjectContent: function(){
      const targetCanvasId = this.activeObjectInfo.canvasId
      const targetObjectId = this.activeObjectInfo.objectId

      let newData = this.data.map(canvas => {
        if(canvas.id !== targetCanvasId){
          return canvas
        }else{
          const updatedCanvas = {
              ...this.newCopy(canvas),
              objects: canvas.objects.map(object => {
                if(object.id !== targetObjectId){
                  return object
                }else {
                  const newCopyObject = this.newCopy(object)
                  delete newCopyObject['content']['value']
                  return newCopyObject
                }
            })
          }

          return updatedCanvas
        }
      })

      if(this.activeObjectInfo.type === 'chart'){
        this.unrenderChart(this.activeObjectInfo.canvasId, this.activeObjectInfo.objectId)
      }
      this.data = newData      
    },

    unrenderChart(canvasId, objectId){
      const chart = document.querySelector(`#object-${canvasId}-${objectId}`)
      const icon = chart.querySelector('.open-modal')

      if(!icon){
        chart.innerHTML = ''
      }
    },

    updateActiveLayout: function(layout){
      this.activeLayout = this.newCopy(layout)
    },

    newCopy: function(object){
      return JSON.parse(JSON.stringify(object))
    },

    addSlide(){
      this.idCount += 1
      const newId = this.idCount
      const newSlide = {...this.activeLayout, id: newId}
      this.data.push(newSlide)
    },

    addChartToSlide: function(newContent){

      const targetCanvasId = this.activeObjectInfo.canvasId
      const targetObjectId = this.activeObjectInfo.objectId

      // Add the highchart options object to activeObjectInfo
      this.updateActiveObjectInfo({value: newContent}, 'content')

      let newData = this.data.map(canvas => {
        if(canvas.id !== targetCanvasId){
          return canvas
        }else{
          const updatedCanvas = {
              ...this.newCopy(canvas),
              objects: canvas.objects.map(object => {
                if(object.id !== targetObjectId){
                  return object
                }else {
                  return {
                    ...this.newCopy(object),
                    content: {type: 'chart', value: newContent}
                  }
                }
            })
          }

          return updatedCanvas
  
        }
      })

      this.data = newData
    },

    getSaveReadyData: function(){
      // Gets updated canvas layouts (since we probably have
      // moved around and resized the objects)
      const updatedLayouts = getLayouts()
      
      let saveReadyData = []
      updatedLayouts.forEach(layout => {
        const targetId = layout.id
        let targetCanvas = this.data.find(canvas => {
          return canvas.id === targetId
        })

        targetCanvas = this.newCopy(targetCanvas)

        layout.objects.forEach(s => {
          const targetObjectId = s.id
          const targetObject = targetCanvas.objects.find(object => object.id === targetObjectId)
          targetObject.style = s.style
        })

        saveReadyData.push(targetCanvas)
      })

      return saveReadyData
    },

    deleteSlideObject: function(targetCanvasId, targetObjectId){
      let newData = this.data.map(canvas => {
        if(canvas.id !== targetCanvasId){
          return canvas
        }else{
          const updatedCanvas = {
              ...this.newCopy(canvas),
              objects: canvas.objects.filter(object => {
                return object.id !== targetObjectId
            })
          }

          return updatedCanvas
        }
      })

      this.data = newData
    },

    updateActiveObjectInfo: function(newInfo, key, option = 'update'){
      // option can be "reset" or "update"

      if(!key && option === 'update'){
        // We could get here if a person only calls this method in the form 
        // updateActiveObjectInfo({canvasId: 1, objectId: 2}) (i.e without extras)
        this.activeObjectInfo = {...this.activeObjectInfo, ...newInfo}

      }else if(option === 'update'){
        // We could get here when calling this method in the form
        // updateActiveObjectInfo({value: "this is amazing"}, 'content')
        // We know that {value: <value> } is inside the content, which is inside
        // the activeObjectInfo. So we are telling this method to not only look for the
        // high level keys, but go inside their content and update the content
        if(typeof(this.activeObjectInfo[key]) === 'object') {
          this.activeObjectInfo = {
            ...this.activeObjectInfo,
            [key]: {...this.activeObjectInfo[key], ...newInfo}
          }
        }
      }else if (option === 'reset'){
        // We get here when we don't want to use existing activeObjectInfo but only want to use the
        // details provided when calling this method
        
        let newActiveObjectInfo =  {
          canvasId: null,
          objectId: null,
          type: "",
          content: {}
        }

        if(!key){ // Reset everything and use only newInfo if key was not provided
          this.activeObjectInfo = {...newActiveObjectInfo, ...newInfo}
        }else { 
          // reset only the key
          newActiveObjectInfo = {
            ...newActiveObjectInfo,
            [key]: this.activeObjectInfo[key]
          }   
          
          this.activeObjectInfo = {...newActiveObjectInfo, ...newInfo}
        }
      }
    }
  }
}
</script>

<style>
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
}

* {
  font-family: Avenir, Helvetica, Arial, sans-serif;

  box-sizing: border-box;
  margin-left: 0;
  margin-right: 0;
  background-color: #f7f7ff;
}
</style>
