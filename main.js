import { db } from "./src/db.js"
const main = async () => {
    await db.start()
}
main()
