const submitBtn = document.querySelector(".sub-btn")
const bookInput = document.querySelector("#input-box")
const bookList = document.querySelector(".book-list")
const bookListTitle = document.getElementById("list-title")
const bookForm = document.querySelector(".book-form")
const msgTxt = document.querySelector(".message")
const clrBtn = document.querySelector(".clr-btn")
const openFileBtn = document.getElementById("openBtn")
const saveAsBtn = document.getElementById("saveAsBtn")

let currentList = 'Book List'
let listQuery = `?list=${encodeURIComponent(currentList)}`
let http = "http://localhost:3000"

openFileBtn.addEventListener("click", async () => {
    await setListName()
    await loadBooks()
    bookListTitle.innerText = currentList
})

saveAsBtn.addEventListener("click", async () => {
    const oldListName = currentList
    await setListName()
    const newListName = currentList    
    const response = await fetch(`${http}/saveas${listQuery}`, {
        method : "POST",
        headers : {'content-type' : 'application/json'},
        body : JSON.stringify({oldListName, newListName})
    })
    if (response.ok) {
        msgTxt.innerHTML = "List saved"
        msgTxt.classList.add("message-success")
        await loadBooks()
        bookListTitle.innerText = currentList
    } else {
        msgTxt.innerHTML = "Save failed"
        msgTxt.classList.add("message-danger")
    }
    setTimeout(() => {
        msgTxt.innerHTML = ""
        msgTxt.classList.remove("message-success", "message-danger")
    }, 1500)
})

edit_case = false
let oldBookName = ""
window.onload = loadBooks

bookForm.addEventListener("submit", async (e) => {
    e.preventDefault()
    const book = bookInput.value.trim()
    if (edit_case) {
        bookInput.value = ""
        await fetch(`${http}/edit${listQuery}`, {
            method : "PUT",
            headers : {
                "content-type" : "text/plain"
            },
            body : JSON.stringify({oldName : oldBookName, newName : book})
        })        
        edit_case = false
        submitBtn.innerHTML = "add"
        bookInput.value = ""
        oldBookName = ""
        await loadBooks()
        return
    }
    
    if (book) {
        await fetch(`${http}/save${listQuery}`, {
            method : "POST",
            headers : {
                "content-type" : "text/plain"
            },
            body : book
        })    
        bookInput.value = ""
        await loadBooks()
    } else {
        msgTxt.innerHTML = "No name"
        msgTxt.classList.add("message-danger")
        setTimeout(() => {
            msgTxt.innerHTML = ""
            msgTxt.classList.remove("message-danger")
        }, 1000)
    }
})

clrBtn.addEventListener("click", clearTheList)

async function loadBooks() {
    const response = await fetch(`${http}/books${listQuery}`)    
    const bookArray = await response.json()
    bookList.innerHTML = ""
    bookArray.forEach((book) => {     
        const article = document.createElement("article")
        article.classList.add("book-item")
        article.innerHTML = `<p class="title">${book}</p>
<div class="btn-container">
    <button type="button" class="ed-btn">
        <i class="fas fa-edit"></i>
    </button>
    <button type="button" class="del-btn">
        <i class="fas fa-trash"></i>
    </button>
</div>`
        const edBtn = article.querySelector(".ed-btn")
        const delBtn = article.querySelector(".del-btn")
        edBtn.addEventListener("click", editBook)
        delBtn.addEventListener("click", () => {deleteBook(article)})
        bookList.appendChild(article)
    })    
}

async function editBook(v) {    
    edit_case = true
    submitBtn.innerHTML = "edit"
    bookInput.value = v.currentTarget.parentElement.previousElementSibling.innerHTML
    oldBookName = bookInput.value    
}

async function deleteBook(bookToDelete) {   
    const inBook = bookToDelete.firstElementChild.innerHTML        
    const response = await fetch(`${http}/delete${listQuery}`, {
        method: 'DELETE',
        headers: {
            'content-type':'text/plain'
        },
        body : bookToDelete.firstElementChild.innerHTML
    })        
    if (response) {              
        loadBooks()
    }   
}

async function clearTheList() {
    const response = await fetch(`${http}/clear${listQuery}`, {
        method: 'DELETE',
        headers: {
            'content-type' : 'text/plain'
        },
        body : "Clear the book list"
    })
    if (response) {
        loadBooks()
    }
}

async function setListName() {
    const listName = prompt("List name: ")
    if (listName && listName.trim() !== "") {
        currentList = listName.trim()
        listQuery = `?list=${encodeURIComponent(listName)}`        
    }    
}